import { DATABASE, LOCALIZATION_MAP } from './database.js';

// =================================================================================
// 遊戲引擎核心 (GAME ENGINE)
// 這是唯一需要修改的檔案。所有邏輯都已正確封裝。
// =================================================================================

export const game = {
    // 遊戲狀態
    state: {
        player: null,
        currentScreen: 'start-screen',
        isRunning: false,
        codex: { monsters: [], items: [], weapons: [], armors: [] },
        canRest: true,
        victoryTimeoutId: null
    },

    // 初始化遊戲
    init() {
        this.ui.init(this);
        this.player.init(this);
        this.quests.init(this);
        this.combat.init(this);
        this.vfx.init(this);
        this.saveLoad.init(this);
        this.audio.init(this);
        
        this.ui.showScreen('start-screen');
        this.addEventListeners();
        
        const loadGameBtn = document.getElementById('load-game-btn');
        if (!localStorage.getItem('Echoes-of-Valor-savegame')) {
            loadGameBtn.disabled = true;
            loadGameBtn.title = '沒有找到存檔';
        } else {
            loadGameBtn.disabled = false;
            loadGameBtn.title = '';
        }
    },
    
    // 所有事件監聽器
    addEventListeners() {
        const gameWindow = document.getElementById('game-window');
        
        gameWindow.addEventListener('click', (e) => {
            if (!this.audio.isInitialized) {
                this.audio.setup();
            }
            
            const target = e.target;
            
            if(target.closest('button')) this.audio.playSound('click');

            const actionButton = target.closest('[data-action]');
            const codexTabButton = target.closest('.codex-tab-button');
            const npcButton = target.closest('.npc-talk-btn');

            if (target.closest('#start-game-btn')) this.ui.showScreen('char-select-screen');
            if (target.closest('#load-game-btn')) this.saveLoad.load();
            if (target.closest('#show-author-btn')) this.ui.showAuthorModal();
            if (target.closest('#confirm-char-btn')) this.ui.showNameInputModal();
            if (target.closest('.char-card')) {
                document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
                target.closest('.char-card').classList.add('selected');
                document.getElementById('confirm-char-btn').classList.remove('hidden');
            }
            if(target.closest('#continue-to-game-btn')) this.ui.showScreen('hub-screen');

            if(npcButton) this.ui.showNPCDialogue(npcButton.dataset.npcId);
            if(target.closest('#go-adventure-btn')) this.actions.adventure();
            if(target.closest('#rest-btn')) this.actions.rest();
            if(target.closest('#go-shop-btn')) this.actions.shop();
            if(target.closest('#show-codex-btn')) this.ui.showCodexModal();
            if(target.closest('#show-help-btn')) this.ui.showHelpModal();
            if(target.closest('#save-btn')) this.saveLoad.save();
            if(target.closest('#load-btn')) this.saveLoad.showLoadConfirmationModal();
            if(target.closest('#return-to-start-btn')) this.ui.showReturnToStartConfirmation();

            if (actionButton && this.state.currentScreen === 'combat-screen') {
                const action = actionButton.dataset.action;
                switch(action) {
                    case 'attack': this.combat.playerAction('attack'); break;
                    case 'skills': this.ui.showSkillTreeModal(true); break;
                    case 'inventory': this.ui.showInventoryModal(true); break;
                    case 'run': this.combat.playerAction('run'); break;
                }
            }

            if (target.closest('#shop-close-btn')) this.ui.showScreen('hub-screen');
            const buyButton = target.closest('#shop-items-container button[data-action="buy"]');
            if (buyButton) {
                const itemId = buyButton.dataset.itemId;
                const itemData = DATABASE.items[itemId];
                if (this.state.player.gold >= itemData.value) {
                    this.state.player.gold -= itemData.value;
                    this.player.addItem(itemId, 1);
                    this.ui.showModal({ title: '購買成功', body: `<p>你購買了 <span class="rarity-${itemData.rarity}">${itemData.name}</span>。</p>`, buttons: [{ text: '好的', fn: () => this.ui.closeModal() }] });
                    this.ui.updateHubUI();
                } else {
                    this.ui.showModal({ title: '金錢不足', body: '<p>你沒有足夠的金錢購買此物品。</p>', buttons: [{ text: '好的', fn: () => this.ui.closeModal() }] });
                }
            }
            
            if (target.closest('#codex-close-btn')) this.ui.closeCodexModal();
            if (codexTabButton) {
                document.querySelectorAll('.codex-tab-button').forEach(b => b.classList.remove('active'));
                codexTabButton.classList.add('active');
                this.ui.renderCodex(codexTabButton.dataset.tab);
            }
        });
    },

    // 開始新遊戲
    startNewGame(playerName) {
        const selectedClass = document.querySelector('.char-card.selected')?.dataset.class;
        if (!selectedClass) return;
        const classData = DATABASE.classes[selectedClass];
        
        let startingInventory = [{itemId: 'healingEgg', quantity: 3, seen: true}];
        if(selectedClass === 'necromancer') {
            startingInventory = [];
        }

        this.state.player = {
            name: playerName, class: selectedClass, className: classData.name, level: 1, exp: 0,
            expToNext: 80,
            baseStats: { ...classData.stats },
            stats: { ...classData.stats }, maxStats: { ...classData.stats },
            skillPoints: 0,
            attributePoints: 0,
            gold: 10,
            inventory: startingInventory,
            equipment: { weapon: null, armor: null, accessory: null, boots: null },
            skills: { ...classData.skills },
            quests: {},
            completedQuests: [],
            storyProgress: 'main01',
            activeEffects: []
        };
        const startingWeapon = Object.values(DATABASE.items).find(item => item.type === 'weapon' && item.class?.includes(selectedClass) && (item.stats.atk <= 5 || item.stats.spi <= 7));
        if(startingWeapon) this.state.player.inventory.push({itemId: startingWeapon.id, quantity: 1, seen: true});

        this.player.recalculateStats();
        this.state.player.stats.hp = this.state.player.maxStats.hp;
        this.state.player.stats.mp = this.state.player.maxStats.mp;
        
        this.ui.showStoryScreen(selectedClass);
        this.state.codex = {monsters: [], items: [], weapons: [], armors: []};
        this.state.player.inventory.forEach(i => this.player.addCodexEntryForItem(i.itemId));
    },

    // 玩家動作
    actions: {
        adventure() { game.ui.showWorldMap(); },
        rest() {
            if (!game.state.player) return;
            if (!game.state.canRest) {
                 game.ui.showModal({ title: '無法休息', body: '<p>你需要先去冒險一次才能再次休息。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }] });
                return;
            }
            const p = game.state.player;
            const hpHeal = Math.floor(p.maxStats.hp * 0.3);
            const mpHeal = Math.floor(p.maxStats.mp * 0.3);
            p.stats.hp = Math.min(p.maxStats.hp, p.stats.hp + hpHeal);
            p.stats.mp = Math.min(p.maxStats.mp, p.stats.mp + mpHeal);
            game.state.canRest = false;
            game.ui.updateHubUI();
            game.ui.showModal({ title: '休息完畢', body: `<p>你恢復了 ${hpHeal} 生命和 ${mpHeal} 法力。</p>`, buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }] });
        },
        shop() { game.ui.showScreen('shop-screen'); },
    },

    // ===================================
    // 子模組 (Sub-modules)
    // ===================================

    ui: {
        init(gameInstance) { this.game = gameInstance; },
        state: { playerTarget: null },
        showScreen(screenId) {
            document.querySelectorAll('.game-window > div:not(#modal-container)').forEach(div => div.classList.add('hidden'));
            document.getElementById(screenId)?.classList.remove('hidden');
            this.game.state.currentScreen = screenId;
            if (screenId === 'char-select-screen') this.renderCharSelect();
            if (screenId === 'hub-screen') {
                document.getElementById('game-container').classList.add('bg-hub');
                document.getElementById('game-container').classList.remove('bg-combat');
                this.renderHub();
                this.game.audio.playMusic('hub');
            }
            if (screenId === 'shop-screen') this.renderShop();
            if (screenId === 'combat-screen') {
                document.getElementById('game-container').classList.remove('bg-hub');
                document.getElementById('game-container').classList.add('bg-combat');
                this.game.audio.playMusic('combat');
            }
            if (screenId === 'start-screen') { this.game.audio.stopMusic(); }
        },
        renderHub() {
            this.updateHubUI();
            const hubContent = document.getElementById('hub-main-content');
            
            let npcButtons = '';
            for(const npcId in DATABASE.npcs) {
                const npc = DATABASE.npcs[npcId];
                npcButtons += `<button data-npc-id="${npcId}" class="npc-talk-btn menu-button w-full py-3">與${npc.name}對話</button>`;
            }
    
            hubContent.innerHTML = `
                <h2 class="text-3xl md:text-4xl font-bold mb-4">橡木鎮</h2>
                <p class="text-gray-400 mb-8 text-center">${DATABASE.locations.oakwood.description}</p>
                <div class="grid grid-cols-1 gap-4 w-full max-w-sm">
                    ${npcButtons}
                    <button id="go-adventure-btn" class="menu-button w-full py-3">離開村莊</button>
                    <button id="rest-btn" class="menu-button w-full py-3">休息</button>
                    <button id="go-shop-btn" class="menu-button w-full py-3">進入商店</button>
                    <button id="show-codex-btn" class="menu-button w-full py-3">冒險圖冊</button>
                    <button id="show-help-btn" class="menu-button w-full py-3">新手教學</button>
                    <button id="save-btn" class="menu-button w-full py-3">儲存進度</button>
                    <button id="load-btn" class="menu-button w-full py-3">讀取進度</button>
                    <button id="return-to-start-btn" class="menu-button w-full py-3 bg-red-800/50 hover:bg-red-700/80">回到主選單</button>
                </div>
            `;
        },
        renderShop() {
            const container = document.getElementById('shop-items-container');
            container.innerHTML = '';
            
            const p = this.game.state.player;
            if (!p) return;
    
            const storyKeys = Object.keys(DATABASE.shop.inventory);
            const currentStoryIndex = storyKeys.indexOf(p.storyProgress);
            
            let availableItems = new Set();
            for(let i = 0; i <= currentStoryIndex; i++) {
                const key = storyKeys[i];
                if (key && DATABASE.shop.inventory[key]) {
                    DATABASE.shop.inventory[key].forEach(itemId => availableItems.add(itemId));
                }
            }
    
            if (availableItems.size === 0) {
                container.innerHTML = '<p class="text-gray-400 col-span-full text-center">商店目前沒有商品。</p>';
                return;
            }
    
            availableItems.forEach(itemId => {
                const itemData = DATABASE.items[itemId];
                if (!itemData) return;
    
                const statsHTML = itemData.stats 
                    ? `<p class="text-xs text-cyan-400 mt-1">${Object.entries(itemData.stats).map(([s,v]) => `${LOCALIZATION_MAP.stats[s] || s.toUpperCase()}: ${v > 0 ? '+' : ''}${v}`).join(' ')}</p>` 
                    : '';
                const itemCard = document.createElement('div');
                itemCard.className = `p-2 rounded-lg bg-black bg-opacity-20 flex flex-col justify-between items-center text-center text-sm border ${itemData.rarity ? 'rarity-border-' + itemData.rarity : 'border-gray-600'}`;
                
                itemCard.innerHTML = `
                    <div class="flex-grow">
                        <h3 class="font-bold rarity-${itemData.rarity}">${itemData.name}</h3>
                        <p class="text-xs text-gray-400 mt-1">${itemData.description}</p>
                        ${statsHTML}
                    </div>
                    <div class="mt-auto w-full pt-2">
                        <p class="text-yellow-400 font-bold">${itemData.value} 金</p>
                        <button data-item-id="${itemId}" data-action="buy" class="menu-button mt-2 px-2 py-1 w-full">購買</button>
                    </div>
                `;
                container.appendChild(itemCard);
            });
        },
        showReturnToStartConfirmation() {
            this.showModal({
                title: '確定返回主選單？',
                body: '<p class="text-gray-400">所有未儲存的進度將會遺失。</p>',
                buttons: [
                    { text: '取消', fn: () => this.closeModal() },
                    { text: '確定', fn: () => { this.closeModal(); window.location.reload(); }, class: 'bg-red-600 hover:bg-red-700 text-white' }
                ]
            });
        },
        showWorldMap() {
             let locationsHTML = '';
            const storyIndex = Object.keys(DATABASE.storyline).indexOf(this.game.state.player.storyProgress);
    
            for (const locId in DATABASE.locations) {
                const loc = DATABASE.locations[locId];
                if (locId === 'oakwood') continue;
                
                const locStoryIndex = Object.keys(DATABASE.storyline).indexOf(loc.storyReq || 'main01');
                const isDisabled = storyIndex < locStoryIndex;
                const buttonClasses = `menu-button w-full text-left p-4 rounded-lg flex items-center justify-between ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`;
                const levelText = isDisabled ? `<span class="text-sm text-red-400"> (故事未解鎖)</span>` : `<span class="text-sm text-gray-400">(Lv.${loc.levelRange[0]}+)</span>`;
                
                locationsHTML += `<button data-loc-id="${locId}" class="${buttonClasses}" ${isDisabled ? 'disabled' : ''}>
                    <div><h4 class="font-bold text-lg">${loc.name} ${levelText}</h4><p class="text-sm text-gray-400">${loc.description || ''}</p></div>
                </button>`;
            }
            this.showModal({
                title: '世界地圖', body: `<p>選擇你要前往的目的地。</p><div class="mt-4 space-y-2">${locationsHTML}</div>`,
                buttons: [{ text: '返回城鎮', fn: () => this.closeModal()}]
            });
            document.querySelectorAll('#modal-container button[data-loc-id]').forEach(btn => {
                btn.addEventListener('click', (e) => { 
                    const locId = e.currentTarget.dataset.locId;
                    this.closeModal();
                    setTimeout(() => this.game.combat.startEncounter(locId), 300);
                });
            });
        },
        showNPCDialogue(npcId) {
             const p = this.game.state.player;
            const npc = DATABASE.npcs[npcId];
            if (!npc) return;
    
            let dialogueKey = 'default';
            let buttons = [];
    
            const completableQuestId = Object.keys(p.quests).find(id => 
                DATABASE.quests[id].npc === npcId && p.quests[id].status === 'completed'
            );
    
            if (completableQuestId) {
                dialogueKey = 'questComplete';
                buttons.push({ text: "這是我的榮幸", fn: () => { this.game.quests.giveReward(completableQuestId); } });
            } else {
                const activeQuestId = Object.keys(p.quests).find(id => 
                    DATABASE.quests[id].npc === npcId && p.quests[id].status === 'active'
                );
                if (activeQuestId) {
                    dialogueKey = 'questInProgress';
                    buttons.push({ text: "我會盡快", fn: () => this.closeModal() });
                } else {
                    const nextQuestId = Object.keys(DATABASE.quests).find(id => 
                        DATABASE.quests[id].npc === npcId && 
                        !p.quests[id] && 
                        !p.completedQuests.includes(id) &&
                        p.storyProgress === id
                    );
    
                    if (nextQuestId) {
                        const questData = DATABASE.quests[nextQuestId];
                        if (p.level >= questData.levelReq) {
                            dialogueKey = 'start';
                            let objectiveDesc = '';
                            switch (questData.objective.type) {
                                case 'kill':
                                    const targetName = DATABASE.monsters[questData.objective.target]?.name || '目標';
                                    objectiveDesc = `請你去擊敗 ${questData.objective.total} 隻 ${targetName}。`;
                                    break;
                                case 'equip':
                                    objectiveDesc = '工匠說，好的裝備是冒險的基礎。去證明你懂得如何使用裝備吧。';
                                    break;
                                case 'level':
                                    objectiveDesc = `你需要變得更強大才能面對未來的挑戰，去將等級提升至 ${questData.objective.total} 級吧。`;
                                    break;
                                default:
                                    objectiveDesc = '我們需要你的幫助。';
                            }
                            
                            buttons.push({ text: "我該怎麼做？", fn: () => {
                                this.showModal({ 
                                    title: npc.name, 
                                    body: `<p>${objectiveDesc}</p>`, 
                                    buttons: [{ text: "交給我吧", fn: () => { this.game.quests.accept(nextQuestId); this.closeModal(); }}]
                                });
                            }});
                            buttons.push({text: "我再考慮一下", fn: () => this.closeModal()});
                        } else {
                            dialogueKey = 'levelTooLow';
                            buttons.push({text: "我明白了", fn: () => this.closeModal()});
                        }
                    } else {
                         dialogueKey = 'postQuest';
                         buttons.push({ text: "再會", fn: () => this.closeModal() });
                    }
                }
            }
            
            const dialogues = {
                elder: {
                    default: "願和平與你同在。",
                    start: {
                        swordsman: "你身上有著帝國軍人的氣質... 年輕的劍客，橡木鎮需要你的力量。",
                        monk: "你的靈力很純淨，孩子。我們需要你的智慧來解決眼前的麻煩。",
                        orc: "好強壯的戰士！希望你的力量能為我們帶來和平，而非毀滅。",
                        necromancer: "我能感受到你身上的死亡氣息... 但我相信你的本質並非邪惡。請幫助我們。",
                        generic: "年輕的旅人，歡迎來到橡木鎮。但恐怕這裡已不再安全...我們需要你的幫助。"
                    },
                    questInProgress: "調查有進展了嗎？森林裡很危險，千萬要小心。",
                    questComplete: "你回來了！真是太感謝你了！這點報酬請務必收下。",
                    postQuest: "多虧了你，鎮子周圍安全多了。但我們仍需找出這一切混亂的根源。",
                    levelTooLow: "你似乎還不夠強大，先在鎮子附近歷練一番，等準備好了再來吧。"
                },
                blacksmith: {
                    default: "需要我幫你看看裝備嗎？",
                    start: { generic: "嘿，年輕人！想打造點什麼嗎？哦？你是來完成任務的？" },
                    questInProgress: "還沒裝備上像樣的東西嗎？快去背包裡找找！",
                    questComplete: "嗯，不錯，人要衣裝，佛要金裝，冒險者當然需要好裝備！這是給你的獎勵！",
                    postQuest: "隨時歡迎回來，我這裡總有好東西。",
                    levelTooLow: "你的等級還不夠，我沒什麼能教你的。"
                }
            };
            
            let bodyText;
            const npcDialogues = dialogues[npcId] || {};
            const keyDialogues = npcDialogues[dialogueKey];
            
            if (typeof keyDialogues === 'object' && keyDialogues !== null) {
                bodyText = keyDialogues[p.class] || keyDialogues.generic;
            } else {
                bodyText = keyDialogues || npcDialogues.default || "你好。";
            }
    
            this.showModal({ title: npc.name, body: `<p>${bodyText}</p>`, buttons });
        },
        showNameInputModal() {
            this.showModal({
                title: "為你的冒險者命名",
                body: `<input id="player-name-input" type="text" class="text-input w-full p-2 rounded" placeholder="輸入名字..." maxlength="12">`,
                buttons: [{text: "確定", fn: () => {
                    const name = document.getElementById('player-name-input').value.trim();
                    if (name) { this.closeModal(); this.game.startNewGame(name); }
                }}]
            });
        },
        renderCharSelect() {
            const container = document.getElementById('char-cards-container');
            container.innerHTML = '';
            document.getElementById('confirm-char-btn').classList.add('hidden'); 
    
            for (const classId in DATABASE.classes) {
                const classData = DATABASE.classes[classId];
                const card = document.createElement('div');
                card.className = 'char-card p-4 rounded-lg slide-in cursor-pointer';
                card.dataset.class = classId;
                card.innerHTML = `
                    <div class="card-header">
                        <h3 class="text-2xl font-bold mb-2">${classData.icon}${classData.name}</h3>
                        <p class="text-gray-400 mb-2">${classData.description}</p>
                        <p class="text-xs text-cyan-400 border-t border-gray-700 pt-2 mt-2"><b>職業特性:</b> ${classData.trait}</p>
                    </div>
                `;
                container.appendChild(card);
            }
        },
        showStoryScreen(classId) {
            const classData = DATABASE.classes[classId];
            document.getElementById('story-title').innerText = `啟程 - ${classData.name}`;
            document.getElementById('story-text').innerText = classData.story;
            this.showScreen('story-screen');
        },
        updateHubUI() {
            if (!this.game.state.player) return;
            this.game.player.recalculateStats();
            const p = this.game.state.player;
            const container = document.getElementById('player-and-quest-status-container');
    
            const classIcon = DATABASE.classes[p.class].icon;
            const expPercent = p.expToNext > 0 ? (p.exp / p.expToNext) * 100 : 0;
            const storyData = DATABASE.storyline[p.storyProgress] || {title: '旅程繼續', description: '繼續你的冒險吧！'};
            
            const storyKeys = Object.keys(DATABASE.storyline);
            const currentStoryIndex = storyKeys.indexOf(p.storyProgress);
            const storyProgressionHTML = storyKeys.map((key, index) => {
                const isCompleted = index < currentStoryIndex;
                const isActive = index === currentStoryIndex;
                let color = 'text-gray-600';
                if (isCompleted) color = 'text-blue-400';
                if (isActive) color = 'text-green-400';
                return `<span class="${color}">${index + 1}</span>`;
            }).join(' - ');
            
            let questHTML = '';
            for (const questId in p.quests) {
                const quest = p.quests[questId];
                const questData = DATABASE.quests[questId];
                let objectiveText = '';
                if (quest.status === 'active') {
                    if (quest.type === 'kill') {
                        const monsterName = DATABASE.monsters[quest.target]?.name || quest.target;
                        objectiveText = `擊敗 ${monsterName} (${quest.current}/${quest.total})`;
                    } else if (quest.type === 'equip') {
                        objectiveText = `裝備一件任意裝備 (${quest.current}/${quest.total})`;
                    } else if (quest.type === 'level') {
                        objectiveText = `提升等級 (${p.level}/${quest.total})`;
                    } else {
                        objectiveText = `${quest.target} (${quest.current}/${quest.total})`;
                    }
                    questHTML += `<div class="mt-2"><p class="font-bold text-green-400">${questData.title}</p><p class="text-sm text-gray-400">- ${objectiveText}</p></div>`;
                } else if (quest.status === 'completed') {
                    questHTML += `<div class="mt-2"><p class="font-bold text-yellow-400">${questData.title} (完成)</p><p class="text-sm text-gray-400">- 前往 ${DATABASE.npcs[questData.npc]?.name || ''} 回報</p></div>`;
                }
            }
    
            container.innerHTML = `
                <div class="scrollable-content">
                    <h3 class="text-xl font-bold mb-2">主線進度</h3>
                    <div class="text-lg font-bold text-center mb-4">${storyProgressionHTML}</div>
                    <div id="hub-story-progress" class="mb-6"><p class="font-bold">${storyData.title}</p><p class="text-sm text-gray-400">${storyData.description}</p></div>
                    
                    <h3 class="text-xl font-bold mb-4">玩家狀態</h3>
                    <div id="hub-player-stats">
                        <p class="text-xl font-bold flex items-center">${classIcon} ${p.name} <span class="text-base text-gray-400 ml-2">Lv.${p.level}</span></p>
                        <div class="mt-4 space-y-2 text-sm">
                            <p>生命: ${p.stats.hp}/${p.maxStats.hp}</p>
                            <div class="hp-bar-container h-2 bg-black/50"><div class="hp-bar-fill" style="width:${p.stats.hp/p.maxStats.hp*100}%"></div></div>
                            <p>法力: ${p.stats.mp}/${p.maxStats.mp}</p>
                            <div class="hp-bar-container h-2 bg-black/50"><div class="mp-bar-fill" style="width:${p.stats.mp > 0 ? (p.stats.mp/p.maxStats.mp*100) : 0}%"></div></div>
                            <p>經驗: ${p.exp}/${p.expToNext}</p>
                            <div class="hp-bar-container h-2 bg-black/50"><div class="exp-bar-fill" style="width:${expPercent}%"></div></div>
                            <hr class="border-gray-600 my-4">
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span>${LOCALIZATION_MAP.stats.atk}: ${p.maxStats.atk}</span><span>${LOCALIZATION_MAP.stats.def}: ${p.maxStats.def}</span>
                                <span>${LOCALIZATION_MAP.stats.spi}: ${p.maxStats.spi}</span><span>${LOCALIZATION_MAP.stats.speed}: ${p.maxStats.speed}</span>
                                <span>${LOCALIZATION_MAP.stats.hit}: ${p.maxStats.hit}</span><span>${LOCALIZATION_MAP.stats.eva}: ${p.maxStats.eva}</span>
                                <span>${LOCALIZATION_MAP.stats.critRate}: ${p.maxStats.critRate}%</span><span>${LOCALIZATION_MAP.stats.critDamage}: ${p.maxStats.critDamage}%</span>
                            </div>
                            <p class="text-yellow-400 font-bold mt-2">金錢: ${p.gold}</p>
                            <div class="flex flex-wrap gap-2 mt-4">
                                <button id="assign-points-btn" class="menu-button text-sm px-2 py-1 ${p.attributePoints > 0 ? '' : 'opacity-50'}">屬性點(${p.attributePoints})</button>
                                <button id="skills-btn" class="menu-button text-sm px-2 py-1 ${p.skillPoints > 0 ? '' : 'opacity-50'}">技能(${p.skillPoints})</button>
                                <div class="relative"><button id="inventory-btn" class="menu-button text-sm px-2 py-1">道具</button></div>
                            </div>
                        </div>
                    </div>
                    <h3 class="text-xl font-bold mt-6 mb-4">任務日誌</h3>
                    <div id="hub-quest-log" class="overflow-y-auto">${questHTML || '<p class="text-gray-500">沒有進行中的任務。</p>'}</div>
                </div>`;
            
            document.getElementById('assign-points-btn')?.addEventListener('click', () => this.showAssignPointsModal());
            document.getElementById('inventory-btn')?.addEventListener('click', () => this.showInventoryModal(false));
            document.getElementById('skills-btn')?.addEventListener('click', () => this.showSkillTreeModal(false));
        },
        renderCombatants() {
            const player = this.game.state.player;
            const playerArea = document.getElementById('combat-player-area');
            playerArea.innerHTML = this.getUnitHTML(player);
            this.updateUnitHP(player, player.stats.hp);
            
            const enemyArea = document.getElementById('combat-enemy-area'); enemyArea.innerHTML = '';
            this.game.combat.state.enemies.forEach(enemy => {
                const enemyDiv = document.createElement('div');
                enemyDiv.innerHTML = this.getUnitHTML(enemy);
                enemyDiv.querySelector('.combat-unit').addEventListener('click', () => {
                    if (!this.game.combat.state.actionInProgress) { 
                        this.state.playerTarget = enemy.id; this.renderCombatants();
                    }
                });
                enemyArea.appendChild(enemyDiv);
            });
            this.renderTurnOrderBar();
        },
        getUnitHTML(unit) {
            const isPlayer = unit.isPlayer;
            const hpPercent = unit.maxStats.hp > 0 ? (unit.stats.hp / unit.maxStats.hp) * 100 : 0;
            const targetedClass = !isPlayer && this.state.playerTarget === unit.id ? 'targeted' : '';
            const id = isPlayer ? 'player' : unit.id;
    
            const statusIconsHTML = unit.activeEffects.map(effect => {
                let colorClass = 'bg-gray-400';
                let title = effect.name;
                if (effect.type === 'buff') colorClass = 'bg-green-500';
                if (effect.type === 'debuff') colorClass = 'bg-yellow-500';
                if (effect.type === 'dot') colorClass = 'bg-purple-500';
                if (effect.type === 'stun') colorClass = 'bg-red-500';
                return `<div class="status-icon ${colorClass}" title="${title} (${effect.turns + 1}回合)"></div>`;
            }).join('');
            
            if (isPlayer) {
                return `
                    <div id="unit-display-player" class="combat-unit p-2 rounded-lg bg-black bg-opacity-20 flex-grow w-full">
                        <div class="flex items-center justify-center"><p class="font-bold text-sm md:text-base flex items-center">${DATABASE.classes[unit.class].icon}${unit.name} <span class="text-xs text-gray-400 ml-1">Lv.${unit.level}</span></p><div class="status-icon-container ml-2">${statusIconsHTML}</div></div>
                        <div class="hp-bar-container mt-1 h-4 bg-black/50"><div id="hp-damage-player" class="hp-bar-damage"></div><div id="hp-fill-player" class="hp-bar-fill"></div></div>
                        <p class="text-xs text-center font-mono">${unit.stats.hp}/${unit.maxStats.hp}</p>
                        <div class="hp-bar-container mt-1 h-2 bg-black/50"><div class="mp-bar-fill" style="width: ${(unit.maxStats.mp > 0 ? unit.stats.mp/unit.maxStats.mp*100 : 0)}%"></div></div>
                        <p class="text-xs text-center font-mono">${unit.stats.mp}/${unit.maxStats.mp}</p>
                    </div>
                    <div class="mt-2 p-2 rounded bg-black/50 text-xs text-center w-full">
                        <div class="grid grid-cols-2 gap-x-2 gap-y-1">
                            <span>${LOCALIZATION_MAP.stats.atk}: ${unit.maxStats.atk}</span><span>${LOCALIZATION_MAP.stats.def}: ${unit.maxStats.def}</span>
                            <span>${LOCALIZATION_MAP.stats.spi}: ${unit.maxStats.spi}</span><span>${LOCALIZATION_MAP.stats.speed}: ${unit.maxStats.speed}</span>
                            <span>${LOCALIZATION_MAP.stats.hit}: ${unit.maxStats.hit}</span><span>${LOCALIZATION_MAP.stats.eva}: ${unit.maxStats.eva}</span>
                            <span>${LOCALIZATION_MAP.stats.critRate}: ${unit.maxStats.critRate}%</span><span>${LOCALIZATION_MAP.stats.critDamage}: ${unit.maxStats.critDamage}%</span>
                        </div>
                    </div>
                `;
            } else {
                 return `
                    <div id="unit-display-${id}" class="combat-unit p-2 rounded-lg ${targetedClass}">
                        <div class="flex items-center justify-center"><p class="font-bold text-sm md:text-base">${unit.name} <span class="text-xs text-gray-400 ml-1">Lv.${unit.level}</span></p><div class="status-icon-container ml-2">${statusIconsHTML}</div></div>
                        <div class="hp-bar-container mt-1 h-4 bg-black/50">
                            <div id="hp-damage-${id}" class="hp-bar-damage" style="width: ${hpPercent}%"></div>
                            <div id="hp-fill-${id}" class="hp-bar-fill" style="width: ${hpPercent}%"></div>
                        </div>
                        <p class="text-xs text-center font-mono">${unit.stats.hp}/${unit.maxStats.hp}</p>
                    </div>`;
            }
        },
        renderTurnOrderBar() {
            const container = document.getElementById('turn-order-bar');
            if (!container || !this.game.state.isRunning) return;
            const turnOrder = this.game.combat.state.turnOrder.filter(c => c.unit.stats.hp > 0);
            container.innerHTML = '<span>行動順序:</span>' + turnOrder.map(c => {
                if (c.isPlayer) {
                    return `<div class="turn-order-icon player-icon" title="${c.unit.name}">${DATABASE.classes[c.unit.class].icon}</div>`;
                } else {
                    return `<div class="turn-order-icon enemy-icon" title="${c.unit.name}">怪</div>`;
                }
            }).join('');
        },
        updateUnitHP(unit, oldHp) {
            const id = unit.id || 'player';
            if(!unit.isPlayer) this.triggerHitEffect(`unit-display-${id}`);
            const oldPercent = (oldHp / unit.maxStats.hp) * 100;
            const newPercent = (unit.stats.hp / unit.maxStats.hp) * 100;
            const damageBar = document.getElementById(`hp-damage-${id}`);
            const fillBar = document.getElementById(`hp-fill-${id}`);
            if(damageBar) damageBar.style.width = `${oldPercent}%`;
            if(fillBar) fillBar.style.width = `${newPercent}%`;
            setTimeout(() => { if(damageBar) damageBar.style.width = `${newPercent}%`; }, 400);
        },
        showCombatLogMessage(message, colorClass = 'text-white') {
            const logBox = document.getElementById('combat-log-box');
            const p = document.createElement('p'); p.className = `${colorClass} slide-in`; p.innerHTML = `> ${message}`;
            logBox.prepend(p); if (logBox.children.length > 20) { logBox.lastChild.remove();
            }
        },
        showModal({ title, body, buttons }) {
            let buttonsHTML = buttons.map((btn, index) => `<button data-btn-index="${index}" class="menu-button px-6 py-2 rounded-lg ${btn.class || ''}">${btn.text}</button>`).join('');
            const contentHTML = `<h3 class="text-2xl font-bold mb-4">${title}</h3><div class="modal-body text-gray-300 modal-scrollable">${body}</div><div class="flex justify-end gap-4 mt-6">${buttonsHTML}</div>`;
            const container = document.getElementById('modal-container');
            container.innerHTML = `<div class="modal-backdrop fade-in"><div class="modal-content slide-in">${contentHTML}</div></div>`;
            container.classList.remove('hidden');
            container.querySelectorAll('button[data-btn-index]').forEach((button, index) => {
                button.addEventListener('click', () => buttons[index].fn());
            });
        },
        closeModal() { document.getElementById('modal-container').classList.add('hidden'); },
        showAuthorModal() { this.showModal({ title: '作者', body: '<p>陳力航</p><p class="text-gray-400 mt-1">一位擁有大俠夢的人</p>', buttons: [{ text: '返回', fn: () => this.closeModal() }]}); },
        showHelpModal() {
            const helpBody = `
                <div class="space-y-4 text-sm">
                    <div>
                        <h4 class="font-bold text-lg text-yellow-300 border-b border-gray-600 pb-1 mb-2">主城鎮功能</h4>
                        <ul class="list-disc list-inside text-gray-300 space-y-1">
                            <li><b>與NPC對話:</b> 接受與回報任務，推動主線劇情。</li>
                            <li><b>離開村莊:</b> 打開世界地圖，選擇要前往的冒險區域。</li>
                            <li><b>休息:</b> 恢復約30%的生命與法力，每次冒險後只能休息一次。</li>
                            <li><b>進入商店:</b> 購買藥水、裝備等補給品。</li>
                            <li><b>冒險圖冊:</b> 查看你已遭遇過的怪物和獲得過的物品資訊。</li>
                            <li><b>儲存/讀取:</b> 手動保存或載入你的遊戲進度。</li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-lg text-yellow-300 border-b border-gray-600 pb-1 mb-2">角色與戰鬥</h4>
                        <ul class="list-disc list-inside text-gray-300 space-y-1">
                            <li><b>升級:</b> 透過戰鬥獲取經驗值以提升等級，升級會完全恢復狀態，並獲得屬性點與技能點。</li>
                            <li><b>屬性點:</b> 在主畫面的玩家狀態欄點擊「屬性點」按鈕，自由分配點數以強化角色。</li>
                            <li><b>技能:</b> 點擊「技能」按鈕，消耗技能點來學習或升級你的職業專屬技能。</li>
                            <li><b>戰鬥介面:</b> 上方的「行動順序」條顯示敵我雙方的行動次序，速度(Speed)越高的單位行動越快。</li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-lg text-yellow-300 border-b border-gray-600 pb-1 mb-2">職業特色</h4>
                        <p class="text-gray-400 mb-2">每個職業都有獨特的被動特性，且部分職業的普通攻擊有獨特的傷害計算方式：</p>
                        <ul class="list-disc list-inside text-gray-300 space-y-1">
                            <li><b class="text-white">劍客:</b> 使用恢復藥水時，效果翻倍。</li>
                            <li><b class="text-white">修士:</b> 戰鬥失敗復活時，不會損失金錢。其普通攻擊傷害部分取決于<span class="text-cyan-400">靈力</span>。</li>
                            <li><b class="text-white">獸人:</b> 無法使用法力藥水，但所有攻擊都附帶<span class="text-blue-400">10%</span>傷害值的法力吸收。</li>
                            <li><b class="text-white">死靈:</b> 無法使用生命藥水，但所有攻擊都附帶<span class="text-green-400">10%</span>傷害值的生命竊取。</li>
                        </ul>
                    </div>
                </div>
            `;
            this.showModal({ title: '新手教學', body: helpBody, buttons: [{ text: '我明白了', fn: () => this.closeModal() }]});
        },
        showInventoryModal(isCombat) {
            if (isCombat) {
                const items = this.game.state.player.inventory.filter(i => DATABASE.items[i.itemId].type === 'consumable');
                let itemsHTML = items.map(itemStack => {
                    const itemData = DATABASE.items[itemStack.itemId];
                    return `<div class="flex justify-between items-center p-2 bg-black bg-opacity-20 rounded mb-2"><div><p class="font-bold rarity-${itemData.rarity}">${itemData.name} x${itemStack.quantity}</p><p class="text-sm text-gray-400">${itemData.description}</p></div><button data-item-id="${itemStack.itemId}" class="menu-button px-4 py-1">使用</button></div>`;
                }).join('') || '<p class="text-gray-400">沒有可用的道具。</p>';
                this.showModal({ 
                    title: '選擇道具', body: `<div class="max-h-64 overflow-y-auto">${itemsHTML}</div>`, 
                    buttons: [{ text: '關閉', fn: () => this.closeModal() }]
                });
                document.querySelectorAll('#modal-container button[data-item-id]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.closeModal();
                        this.game.combat.playerAction('item', e.currentTarget.dataset.itemId);
                    });
                });
                return;
            }
    
            const p = this.game.state.player;
            p.inventory.forEach(i => i.seen = true);
            const render = (tab) => {
                let itemsHTML = '';
                if (tab === 'items') {
                     const items = p.inventory.filter(i => ['consumable', 'material', 'skillbook'].includes(DATABASE.items[i.itemId].type));
                     itemsHTML = items.map(itemStack => {
                         const itemData = DATABASE.items[itemStack.itemId];
                         const buttonHTML = ['consumable', 'skillbook'].includes(itemData.type) ? `<button data-action-type="use" data-item-id="${itemStack.itemId}" class="menu-button px-4 py-1">使用</button>` : '';
                         return `<div class="flex justify-between items-center p-2 bg-black bg-opacity-20 rounded mb-2"><div><p class="font-bold rarity-${itemData.rarity}">${itemData.name} x${itemStack.quantity}</p><p class="text-sm text-gray-400">${itemData.description}</p></div>${buttonHTML}</div>`;
                     }).join('') || '<p class="text-gray-400">沒有道具。</p>';
                } else if (tab === 'equipment') {
                    const equipmentInBag = p.inventory.filter(i => ['weapon', 'armor', 'accessory', 'boots'].includes(DATABASE.items[i.itemId].type));
                    itemsHTML = '';
                    
                    const slots = { weapon: '武器', armor: '護甲', accessory: '飾品', boots: '靴子' };
                    let paperDollHTML = '<div class="grid grid-cols-2 gap-2 mb-4">';
                    for(const slot in slots) {
                        const itemId = p.equipment[slot];
                        let slotContent = `<span class="text-gray-500">${slots[slot]} - 無</span>`;
                        let buttonHTML = '';
                        if(itemId) {
                            const itemData = DATABASE.items[itemId];
                             const statsHTML = itemData.stats 
                                ? `<div class="text-xs text-cyan-400">${Object.entries(itemData.stats).map(([s,v]) => `${LOCALIZATION_MAP.stats[s] || s.toUpperCase()}: ${v > 0 ? '+' : ''}${v}`).join(' ')}</div>` 
                                : '';
                            slotContent = `<div><span class="font-bold rarity-${itemData.rarity}">${slots[slot]} - ${itemData.name}</span>${statsHTML}</div>`;
                            buttonHTML = `<button data-action-type="unequip" data-slot="${slot}" class="menu-button px-2 py-1 text-xs">拆除</button>`;
                        }
                        paperDollHTML += `<div class="p-2 bg-black/20 rounded flex justify-between items-center">${slotContent}${buttonHTML}</div>`;
                    }
                    paperDollHTML += '</div>';
                    
                    itemsHTML += paperDollHTML;
                    
                    if (equipmentInBag.length > 0) itemsHTML += '<hr class="border-gray-600 my-4">';
                    itemsHTML += equipmentInBag.map(itemStack => {
                        const itemData = DATABASE.items[itemStack.itemId];
                        const statsHTML = itemData.stats ? `<p class="text-xs text-cyan-400">${Object.entries(itemData.stats).map(([s,v]) => `${LOCALIZATION_MAP.stats[s] || s.toUpperCase()}: ${v}`).join(', ')}</p>` : '';
                        return `<div class="flex justify-between items-center p-2 bg-black/20 rounded mb-2"><div><p class="font-bold rarity-${itemData.rarity}">${itemData.name} x${itemStack.quantity}</p>${statsHTML}</div><button data-action-type="equip" data-item-id="${itemStack.itemId}" class="menu-button px-4 py-1">裝備</button></div>`;
                    }).join('');
                    if (itemsHTML === paperDollHTML && equipmentInBag.length === 0) itemsHTML += '<p class="text-gray-400">背包中沒有可裝備的物品。</p>';
                }
                this.showModal({ 
                    title: '道具背包', body: `<div class="flex border-b-2 border-gray-700 mb-4"><button data-tab="items" class="tab-button flex-1 py-2 ${tab === 'items' ? 'active' : ''}">道具</button><button data-tab="equipment" class="tab-button flex-1 py-2 ${tab === 'equipment' ? 'active' : ''}">裝備</button></div><div id="inventory-content" class="modal-scrollable">${itemsHTML}</div>`, 
                    buttons: [{ text: '關閉', fn: () => this.closeModal() }]
                });
                document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', (e) => render(e.target.dataset.tab)));
                document.querySelectorAll('#inventory-content button').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const { actionType, itemId, slot } = e.currentTarget.dataset;
                        if (actionType === 'use' && this.game.player.useItem(itemId, false)) render('items');
                        else if (actionType === 'equip' && this.game.player.equipItem(itemId)) render('equipment');
                        else if (actionType === 'unequip' && this.game.player.unequipItem(slot)) render('equipment');
                    });
                });
            };
            render('equipment');
        },
        showSkillTreeModal(isCombat) {
            const p = this.game.state.player;
            const classSkills = Object.entries(DATABASE.skills).filter(([id, data]) => data.class === p.class);
            const skillsHTML = classSkills.map(([skillId, skillData]) => {
                const currentLevel = p.skills[skillId] || 0;
                const isMaxLevel = currentLevel >= skillData.maxLevel;
                const displayLevel = Math.max(1, currentLevel);
                const skillInfo = skillData.levels[displayLevel - 1];
                
                let costHTML = '';
                if(skillInfo.mpCost) costHTML = `<span class="text-blue-400">MP: ${skillInfo.mpCost}</span>`;
                else if(skillInfo.hpCost) costHTML = `<span class="text-red-400">HP: ${Math.floor(p.maxStats.hp * skillInfo.hpCost)}</span>`;
                else if(skillData.levels[0].special?.type === 'last_stand') costHTML = `<span class="text-blue-400">MP: 2/3</span>`;
    
                const levelText = currentLevel > 0 ? ` <span class="text-yellow-400">Lv.${currentLevel}${isMaxLevel ? ' (MAX)' : ''}</span>` : '';
                const prerequisite = skillData.prerequisite;
                const preReqText = prerequisite ? ` (前置: ${DATABASE.skills[prerequisite.skillId].name} Lv.${prerequisite.level})` : '';
                const levelReqText = ` (需要等級: ${skillData.levelReq})`;
                const description = skillInfo.description + (prerequisite ? preReqText : '') + (currentLevel === 0 ? levelReqText : '');
    
                let buttonHTML = '';
                if (isCombat) {
                    if (currentLevel > 0) buttonHTML = `<button data-skill-id="${skillId}" class="menu-button px-4 py-1">使用</button>`;
                } else {
                    if (currentLevel === 0 && p.skillPoints > 0 && p.level >= skillData.levelReq && (!prerequisite || (p.skills[prerequisite.skillId] >= prerequisite.level))) {
                        buttonHTML = `<button data-action="learn" data-skill-id="${skillId}" class="menu-button px-4 py-1 bg-green-700">學習</button>`;
                    } else if (currentLevel > 0 && !isMaxLevel && p.skillPoints > 0) {
                        buttonHTML = `<button data-action="upgrade" data-skill-id="${skillId}" class="menu-button px-4 py-1">升級</button>`;
                    }
                }
                return `<div class="p-3 bg-black/20 rounded mb-2 ${p.level < skillData.levelReq ? 'opacity-50' : ''}">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="font-bold">${skillData.name}${levelText}</p>
                                    <p class="text-xs text-gray-500">${skillData.category || ''} | ${costHTML}</p>
                                </div>
                                <div class="flex-shrink-0 ml-2">${buttonHTML}</div>
                            </div>
                            <p class="text-sm text-gray-400 mt-1">${description}</p>
                        </div>`;
            }).join('');
            
            this.showModal({ 
                title: isCombat ? '選擇技能' : '技能', 
                body: `<p class="mb-4 text-lg">剩餘技能點: <span class="font-bold text-yellow-400">${p.skillPoints}</span></p><div class="modal-scrollable">${skillsHTML}</div>`, 
                buttons: [{ text: '關閉', fn: () => this.closeModal() }] 
            });
            document.querySelectorAll('#modal-container button[data-skill-id]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const skillId = e.currentTarget.dataset.skillId;
                    const action = e.currentTarget.dataset.action;
                    if (isCombat) { this.closeModal(); this.game.combat.playerAction('skill', skillId); }
                    else if (action === 'learn') { p.skills[skillId] = 1; p.skillPoints--; this.showSkillTreeModal(false); }
                    else if (action === 'upgrade') { p.skills[skillId]++; p.skillPoints--; this.showSkillTreeModal(false); }
                });
            });
        },
        showAssignPointsModal() {
            const p = this.game.state.player;
            const stats = ['atk', 'def', 'spi', 'hit', 'eva', 'speed'];
            let tempPoints = p.attributePoints;
            let tempChanges = {};
            const render = () => {
                const statsHTML = stats.map(stat => `
                    <div class="flex justify-between items-center mb-2">
                        <span class="capitalize font-bold">${LOCALIZATION_MAP.stats[stat]}: ${p.baseStats[stat] + (tempChanges[stat] || 0)}</span>
                        <div>
                         <button data-stat="${stat}" data-change="-1" class="minus-stat-btn menu-button w-8 h-8 ${!tempChanges[stat] || tempChanges[stat] <= 0 ? 'opacity-50' : ''}">-</button>
                         <button data-stat="${stat}" data-change="1" class="plus-stat-btn menu-button w-8 h-8 ${tempPoints <= 0 ? 'opacity-50' : ''}">+</button>
                        </div>
                    </div>`).join('');
                this.showModal({
                    title: '分配屬性點',
                    body: `<p class="mb-4">剩餘點數: <span id="points-left">${tempPoints}</span></p>
                           <div class="mb-4"><label for="add-points-input">一次增加：</label><input type="number" id="add-points-input" class="text-input w-20 p-1 rounded" value="1" min="1"></div>
                           <div class="space-y-2">${statsHTML}</div>`,
                    buttons: [
                        { text: '取消', fn: () => { this.closeModal(); this.updateHubUI(); }},
                        { text: '確定', fn: () => { 
                            for (const stat in tempChanges) p.baseStats[stat] += tempChanges[stat];
                            p.attributePoints = tempPoints;
                            this.game.player.recalculateStats(); this.closeModal(); this.updateHubUI();
                        }}
                    ]
                });
                document.querySelectorAll('.plus-stat-btn, .minus-stat-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const stat = e.currentTarget.dataset.stat;
                        const changeDirection = parseInt(e.currentTarget.dataset.change);
                        const amount = parseInt(document.getElementById('add-points-input').value) || 1;
                        
                        if (changeDirection > 0 && tempPoints >= amount) {
                            tempPoints -= amount;
                            tempChanges[stat] = (tempChanges[stat] || 0) + amount;
                        } else if (changeDirection < 0 && (tempChanges[stat] || 0) >= amount) {
                            tempPoints += amount;
                            tempChanges[stat] -= amount;
                        }
                        render();
                    });
                });
            }
            render();
        },
        showCodexModal() {
            document.getElementById('codex-modal').classList.remove('hidden');
            
            const updateCount = (type) => {
                const known = this.game.state.codex[type]?.length || 0;
                const total = DATABASE.codex[type]?.length || 0;
                const el = document.getElementById(`codex-${type}-count`);
                if (el) el.textContent = `(${known}/${total})`;
            };
            ['monsters', 'items', 'weapons', 'armors'].forEach(updateCount);
            
            const defaultTab = document.querySelector('.codex-tab-button[data-tab="monsters"]');
            document.querySelectorAll('.codex-tab-button').forEach(b => b.classList.remove('active'));
            if(defaultTab) defaultTab.classList.add('active');
            this.renderCodex('monsters');
        },
        renderCodex(tab) {
            const contentEl = document.getElementById('codex-content');
            const allEntries = DATABASE.codex[tab] || [];
            const knownEntries = this.game.state.codex[tab] || [];
            
            if (allEntries.length === 0) {
                contentEl.innerHTML = `<p class="text-center text-gray-400">目前沒有任何記錄。</p>`;
                return;
            }
    
            const contentHTML = allEntries.map(id => {
                const data = DATABASE.monsters[id] || DATABASE.items[id];
                if (!data) {
                    console.warn(`圖冊中找不到 ID 為 ${id} 的資料。`);
                    return ''; 
                }
    
                const found = knownEntries.includes(id);
                const title = found ? data.name : '???';
                const description = found ? (tab === 'monsters' ? `Lv.${data.level}` : data.description) : '尚未發現';
                
                const rarityClass = found ? `rarity-${data.rarity || 'common'}` : 'rarity-common';
                const grayscaleClass = !found ? 'grayscale opacity-50' : '';
    
                return `<div class="p-2 rounded-lg bg-black/20 border border-gray-600 ${grayscaleClass}">
                            <h4 class="font-bold ${rarityClass}">${title}</h4>
                            <p class="text-xs text-gray-400">${description}</p>
                        </div>`;
            }).join('');
    
            contentEl.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 gap-2">${contentHTML}</div>`;
        },
        closeCodexModal() {
            document.getElementById('codex-modal').classList.add('hidden');
        },
        triggerHitEffect(elementId) {
            const el = document.getElementById(elementId);
            if (el) { 
                el.classList.remove('hit-effect');
                void el.offsetWidth;
                el.classList.add('hit-effect');
            }
        }
    },

    player: {
        init(gameInstance) { this.game = gameInstance; },
        addExp(amount) {
            if (!this.game.state.player || amount <= 0) return;
            const p = this.game.state.player;
            p.exp += amount;
            let leveledUp = false;
            while (p.exp >= p.expToNext) { this.levelUp(); leveledUp = true; }
            if (leveledUp) {
                setTimeout(() => {
                    this.game.ui.showModal({ title: '等級提升！', body: `<p>你升到了 ${p.level} 級！你的能力已完全恢復並獲得了提升！</p>`, buttons: [{text: '太棒了！', fn: () => this.game.ui.closeModal()}] });
                }, 500);
            }
        },
        levelUp() {
            const p = this.game.state.player;
            p.exp -= p.expToNext;
            p.exp = Math.max(0, p.exp);
            p.level++;
            p.expToNext = Math.floor(80 * Math.pow(p.level, 1.4));
            
            p.skillPoints += 1;
            p.attributePoints += 3;
            const growth = DATABASE.classGrowth;
            const classGrowth = growth[p.class];
            for(const stat in classGrowth) { p.baseStats[stat] += classGrowth[stat]; }
            
            this.recalculateStats();
            p.stats.hp = p.maxStats.hp; p.stats.mp = p.maxStats.mp;
            this.game.quests.advance('level', 'any');
            this.game.audio.playSound('levelUp');
        },
        recalculateStats() {
            const p = this.game.state.player;
            if(!p) return;
            const oldMaxHp = p.maxStats?.hp || p.baseStats.hp;
    
            p.maxStats = { ...p.baseStats };
            
            for(const slot in p.equipment) {
                if (p.equipment[slot]) {
                    const item = DATABASE.items[p.equipment[slot]];
                    if (item.stats) {
                        for(const stat in item.stats) { p.maxStats[stat] += item.stats[stat]; }
                    }
                }
            }
    
            const statBuffs = {};
            const statMultipliers = {};
            p.activeEffects.forEach(effect => {
                if (effect.type === 'buff' || effect.type === 'debuff') {
                    if(effect.stats) {
                        for(const stat in effect.stats) {
                             statBuffs[stat] = (statBuffs[stat] || 0) + effect.stats[stat];
                        }
                    } else if (effect.stat && effect.value) {
                        statBuffs[effect.stat] = (statBuffs[effect.stat] || 0) + effect.value;
                    }
                    if(effect.stat && effect.multiplier) {
                        statMultipliers[effect.stat] = (statMultipliers[effect.stat] || 1) * effect.multiplier;
                    }
                }
            });
            for (const stat in statBuffs) { p.maxStats[stat] += statBuffs[stat]; }
            for (const stat in statMultipliers) { p.maxStats[stat] *= statMultipliers[stat]; }
    
            p.maxStats.mp = p.maxStats.mp + Math.floor(p.maxStats.spi * 1.5);
            for(const stat in p.maxStats) { p.maxStats[stat] = Math.max(0, Math.round(p.maxStats[stat])); }
            
            if(p.maxStats.hp > oldMaxHp) { p.stats.hp += (p.maxStats.hp - oldMaxHp); }
            
            p.stats.hp = Math.min(p.stats.hp, p.maxStats.hp);
            p.stats.mp = Math.min(p.stats.mp, p.maxStats.mp);
        },
        addItem(itemId, quantity) {
            const p = this.game.state.player;
            const existingItem = p.inventory.find(i => i.itemId === itemId);
            if (existingItem) { 
                existingItem.quantity += quantity;
                existingItem.seen = false;
            } 
            else { p.inventory.push({ itemId, quantity, seen: false }); }
            this.addCodexEntryForItem(itemId);
            this.game.ui.updateHubUI();
        },
        addCodexEntryForItem(itemId, type) {
            const itemData = DATABASE.items[itemId];
            if(type === 'monsters' && this.game.state.codex.monsters && !this.game.state.codex.monsters.includes(itemId)) {
                this.game.state.codex.monsters.push(itemId);
                return;
            }
            if (!itemData) return;
            let itemType;
            if (itemData.type === 'weapon') itemType = 'weapons';
            else if (['armor', 'accessory', 'boots'].includes(itemData.type)) itemType = 'armors';
            else itemType = 'items';
            if (this.game.state.codex[itemType] && !this.game.state.codex[itemType].includes(itemId)) {
                this.game.state.codex[itemType].push(itemId);
            }
        },
        useItem(itemId, isCombat) {
            const p = this.game.state.player;
            const itemStack = p.inventory.find(i => i.itemId === itemId);
            if (!itemStack) return false;
            const itemData = DATABASE.items[itemId];
            
            let effectApplied = false;
            if (itemData.type === 'skillbook') {
                if (isCombat) { this.game.ui.showModal({ title: '無法使用', body: '<p>戰鬥中無法學習技能。</p>', buttons: [{ text: '關閉', fn: () => this.game.ui.closeModal() }]}); return false; }
                if (p.skills[itemData.skillId] && p.skills[itemData.skillId] >= DATABASE.skills[itemData.skillId].maxLevel) {
                    this.game.ui.showModal({ title: '無法使用', body: '<p>你已學會此技能的最高等級。</p>', buttons: [{ text: '關閉', fn: () => this.game.ui.closeModal() }]}); return false;
                }
                p.skills[itemData.skillId] = (p.skills[itemData.skillId] || 0) + 1;
                this.game.ui.showModal({ title: '學習成功', body: `<p>你學會了 ${DATABASE.skills[itemData.skillId].name}！</p>`, buttons: [{ text: '好的', fn: () => this.game.ui.closeModal() }]});
                effectApplied = true;
            } else if (itemData.type === 'consumable') {
                if (itemData.combatOnly && !isCombat) {
                    this.game.ui.showModal({title: '無法使用', body: '<p>此道具只能在戰鬥中使用。</p>', buttons: [{ text: '關閉', fn: () => this.game.ui.closeModal() }]}); return false;
                }
                const effect = itemData.effect;
                switch(effect.type) {
                    case 'heal_hp': 
                        if (p.class === 'necromancer') { this.game.ui.showModal({ title: '亡靈之軀', body: '<p>你無法從藥水中恢復生命。</p>', buttons: [{ text: '關閉', fn: () => this.game.ui.closeModal() }]}); return false; }
                        let hpValue = p.class === 'swordsman' ? effect.value * 2 : effect.value;
                        p.stats.hp = Math.min(p.maxStats.hp, p.stats.hp + hpValue);
                        if (isCombat) { this.game.audio.playSound('heal'); this.game.vfx.play('heal', document.getElementById('unit-display-player')); this.game.ui.showCombatLogMessage(`${p.name} 恢復了 ${hpValue} 點生命。`, 'text-green-400'); }
                        break;
                    case 'heal_mp': 
                        if (p.class === 'orc') { this.game.ui.showModal({ title: '野蠻體質', body: '<p>你無法從藥水中恢復法力。</p>', buttons: [{ text: '關閉', fn: () => this.game.ui.closeModal() }]}); return false; }
                        let mpValue = p.class === 'swordsman' ? effect.value * 2 : effect.value;
                        p.stats.mp = Math.min(p.maxStats.mp, p.stats.mp + mpValue);
                         if (isCombat) this.game.ui.showCombatLogMessage(`${p.name} 恢復了 ${mpValue} 點法力。`, 'text-blue-400');
                        break;
                    case 'buff':
                        if (isCombat) { this.game.combat.applyEffect(p, { ...effect }); this.game.ui.showCombatLogMessage(`${p.name} 的 ${LOCALIZATION_MAP.stats[effect.stat]} 提升了！`, 'text-yellow-400'); }
                        break;
                    case 'escape':
                        if (isCombat) this.game.combat.playerAction('run', true);
                        break;
                    case 'cure':
                        if (isCombat) {
                            const ailmentIndex = p.activeEffects.findIndex(e => e.id === effect.ailment);
                            if (ailmentIndex > -1) {
                                const ailmentName = p.activeEffects[ailmentIndex].name;
                                p.activeEffects.splice(ailmentIndex, 1);
                                this.game.ui.showCombatLogMessage(`${p.name} 解除了 ${ailmentName} 狀態。`, 'text-green-400');
                                this.recalculateStats();
                            } else { this.game.ui.showCombatLogMessage('沒有效果。', 'text-gray-400'); }
                        }
                        break;
                }
                effectApplied = true;
            } else { return false; }
    
            if(effectApplied){
                itemStack.quantity--;
                if (itemStack.quantity <= 0) { p.inventory = p.inventory.filter(i => i.itemId !== itemId); }
                this.game.ui.updateHubUI();
            }
            return effectApplied;
        },
        equipItem(itemId) {
            const p = this.game.state.player;
            const itemData = DATABASE.items[itemId];
            if (!itemData || !['weapon', 'armor', 'accessory', 'boots'].includes(itemData.type)) return;
            const canEquip = !itemData.class || itemData.class.includes(p.class);
            if (!canEquip) { this.game.ui.showModal({title: "無法裝備", body: "<p>你的職業無法使用此物品。</p>", buttons: [{text: '關閉', fn: () => this.game.ui.closeModal()}]}); return false; }
            const itemStack = p.inventory.find(i => i.itemId === itemId);
            if (!itemStack) return false;
            
            if (p.equipment[itemData.slot]) { this.unequipItem(itemData.slot); }
            p.equipment[itemData.slot] = itemId;
            itemStack.quantity--;
            if (itemStack.quantity <= 0) { p.inventory = p.inventory.filter(i => i.itemId !== itemId); }
            this.recalculateStats();
            this.game.audio.playSound('equip');
            this.game.quests.advance('equip', 'any');
            this.addCodexEntryForItem(itemId);
            this.game.ui.updateHubUI();
            return true;
        },
        unequipItem(slot) {
            const p = this.game.state.player;
            const itemId = p.equipment[slot];
            if (itemId) { 
                this.addItem(itemId, 1); 
                p.equipment[slot] = null; 
                this.recalculateStats();
                this.game.audio.playSound('equip');
            }
            this.game.ui.updateHubUI();
            return true;
        }
    },

    quests: {
        init(gameInstance) { this.game = gameInstance; },
        accept(questId) {
            const p = this.game.state.player;
            if (p.quests[questId]) return;
            
            const questData = DATABASE.quests[questId];
            if (p.level < questData.levelReq) {
                 this.game.ui.showModal({ title: '時機未到', body: `<p>你的等級不足以接受此任務。</p>`, buttons: [{ text: '好的', fn: () => this.game.ui.closeModal() }]});
                return;
            }
            
            p.quests[questId] = { ...questData.objective };
            if (questData.objective.type === 'level') { p.quests[questId].current = p.level; } 
            else { p.quests[questId].current = 0; }
            p.quests[questId].status = 'active';
    
            let justCompleted = false;
            if (questData.objective.type === 'level' && p.level >= questData.objective.total) {
                p.quests[questId].current = p.level;
                p.quests[questId].status = 'completed';
                justCompleted = true;
            } else if (questData.objective.type === 'equip' && Object.values(p.equipment).some(item => item !== null)) {
                p.quests[questId].current = 1;
                p.quests[questId].status = 'completed';
                justCompleted = true;
            }
    
            this.game.ui.updateHubUI();
            if (justCompleted) {
                this.game.ui.showModal({ title: '任務目標達成！', body: `<p>你已經達成了任務目標: ${questData.title}！回去找NPC回報吧。</p>`, buttons: [{text: '好的', fn: () => this.game.ui.closeModal()}]});
            } else {
                this.game.ui.showModal({ title: '新任務', body: `<p>你接受了任務: ${questData.title}</p>`, buttons: [{text: '好的', fn: () => this.game.ui.closeModal()}]});
            }
        },
        advance(type, target) {
            const p = this.game.state.player;
            for (const questId in p.quests) {
                const quest = p.quests[questId];
                if (quest.status !== 'active') continue;
    
                if (quest.type === type && (quest.target === target || quest.target === 'any')) {
                    if (quest.type === 'level') { quest.current = p.level; } 
                    else { if (quest.current < quest.total) { quest.current++; } }
    
                   if (quest.current >= quest.total) {
                       quest.status = 'completed';
                       this.game.ui.showModal({ title: '任務目標達成！', body: `<p>你完成了任務目標: ${DATABASE.quests[questId].title}！回去找NPC回報吧。</p>`, buttons: [{text: '好的', fn: () => this.game.ui.closeModal()}]});
                   }
                   this.game.ui.updateHubUI();
               }
            }
        },
        isComplete(questId) {
            const questState = this.game.state.player.quests[questId];
            return questState && questState.status === 'completed';
        },
        giveReward(questId) {
            const p = this.game.state.player;
            const questData = DATABASE.quests[questId];
            if (!questData) return;
            let rewardHTML = '';
            if (questData.reward.exp) { 
                this.game.player.addExp(questData.reward.exp);
                rewardHTML += `<p>經驗值: ${questData.reward.exp}</p>`;
            }
            if (questData.reward.items) { 
                questData.reward.items.forEach(rewardItem => {
                    if (rewardItem.classSpecific) {
                        const itemId = rewardItem[p.class];
                        if (itemId) {
                            this.game.player.addItem(itemId, 1);
                            const itemData = DATABASE.items[itemId];
                            rewardHTML += `<p><span class="rarity-${itemData.rarity}">${itemData.name}</span> x1</p>`;
                        }
                    } else {
                        this.game.player.addItem(rewardItem.itemId, rewardItem.quantity); 
                        const itemData = DATABASE.items[rewardItem.itemId];
                        rewardHTML += `<p><span class="rarity-${itemData.rarity}">${itemData.name}</span> x${rewardItem.quantity}</p>`;
                    }
                });
            }
            if (questData.reward.gold) { 
                p.gold += questData.reward.gold;
                rewardHTML += `<p>金錢: ${questData.reward.gold}</p>`;
            }
            if (questData.reward.skillPoints) {
                p.skillPoints += questData.reward.skillPoints;
                rewardHTML += `<p>技能點: ${questData.reward.skillPoints}</p>`;
            }
            
            if (questData.onComplete) { questData.onComplete(p); }
            delete p.quests[questId];
            p.completedQuests.push(questId);
            this.game.ui.showModal({
                title: '任務完成！',
                body: `<p>你完成了任務 "${questData.title}"！</p><hr class="my-2 border-gray-600"><p>獲得獎勵：</p>${rewardHTML}`,
                buttons: [{ text: '好的', fn: () => { this.game.ui.closeModal(); this.game.ui.updateHubUI(); } }]
            });
        }
    },

    combat: {
        init(gameInstance) { this.game = gameInstance; },
        state: { enemies: [], defeatedEnemiesInCombat: [], turnOrder: [], turnIndex: 0, actionInProgress: false },
        startEncounter(locationId) {
            const locationData = DATABASE.locations[locationId];
            if (!locationData) return;
            const enemyCount = Math.floor(Math.random() * 3) + 1;
            let encounterEnemies = [];
            for (let i = 0; i < enemyCount; i++) {
                const randomEnemyId = locationData.monsters[Math.floor(Math.random() * locationData.monsters.length)];
                encounterEnemies.push(randomEnemyId);
            }
            this.start(encounterEnemies);
        },
        start(enemyIds) {
            this.game.state.isRunning = true;
            this.state.actionInProgress = false;
            this.state.enemies = enemyIds.map((id, index) => {
                const original = DATABASE.monsters[id];
                return {
                    ...JSON.parse(JSON.stringify(original)),
                    id: `${id}-${index}`,
                    isPlayer: false,
                    stats: { ...original.stats },
                    maxStats: { ...original.stats },
                    activeEffects: []
                };
            });
            this.state.defeatedEnemiesInCombat = [];
            this.game.ui.state.playerTarget = this.state.enemies[0]?.id;
            this.game.ui.showScreen('combat-screen');
            this.determineTurnOrder();
            this.game.ui.renderCombatants();
            document.getElementById('combat-log-box').innerHTML = '';
            this.game.ui.showCombatLogMessage('戰鬥開始！', 'text-yellow-400');
            this.nextTurn();
        },
        determineTurnOrder() {
            const combatants = [{ unit: this.game.state.player, isPlayer: true }, ...this.state.enemies.map(e => ({ unit: e, isPlayer: false }))];
            this.state.turnOrder = combatants.sort((a, b) => b.unit.stats.speed - a.unit.stats.speed);
            this.state.turnIndex = 0;
        },
        nextTurn() {
            if (!this.game.state.isRunning) return;
            this.game.ui.renderCombatants();
    
            if (this.state.enemies.every(e => e.stats.hp <= 0)) {
                this.end(true);
                return;
            }
            if (this.game.state.player.stats.hp <= 0) {
                this.end(false);
                return;
            }
    
            const currentTurn = this.state.turnOrder[this.state.turnIndex];
            if (currentTurn.unit.stats.hp <= 0) {
                this.state.turnIndex = (this.state.turnIndex + 1) % this.state.turnOrder.length;
                this.nextTurn();
                return;
            }
    
            if (currentTurn.isPlayer) {
                this.toggleActionButtons(true);
                this.game.ui.showCombatLogMessage('你的回合！', 'text-green-400');
            } else {
                this.toggleActionButtons(false);
                setTimeout(() => this.enemyAction(currentTurn.unit), 1000);
            }
        },
        playerAction(action, option) {
            if (this.state.actionInProgress) return;
            this.state.actionInProgress = true;
            this.toggleActionButtons(false);
    
            const player = this.game.state.player;
            let target = this.state.enemies.find(e => e.id === this.game.ui.state.playerTarget);
            if (!target || target.stats.hp <= 0) {
                target = this.state.enemies.find(e => e.stats.hp > 0);
                if(target) this.game.ui.state.playerTarget = target.id;
            }
    
            switch (action) {
                case 'attack':
                    if (!target) { this.game.ui.showCombatLogMessage('沒有目標！', 'text-red-400'); break; }
                    this.executeAttack(player, target);
                    break;
                case 'skill':
                    this.executeSkill(player, option, target);
                    break;
                case 'item':
                    if(this.game.player.useItem(option, true)) {
                        // Item use logic handles its own messages.
                    } else {
                         this.state.actionInProgress = false;
                         this.toggleActionButtons(true);
                         return; 
                    }
                    break;
                case 'run':
                    if (this.state.enemies.some(e => e.isBoss) && !option) {
                        this.game.ui.showCombatLogMessage('無法從首領戰中逃跑！', 'text-red-500');
                        this.state.actionInProgress = false;
                        this.toggleActionButtons(true);
                        return;
                    }
                    const escapeChance = option ? 1 : 0.75;
                    if (Math.random() < escapeChance) {
                        this.game.ui.showCombatLogMessage('你成功逃跑了！', 'text-yellow-400');
                        this.end(false, true);
                        return;
                    } else {
                        this.game.ui.showCombatLogMessage('逃跑失敗！', 'text-red-400');
                    }
                    break;
            }
            
            setTimeout(() => this.processTurnEnd(), 500);
        },
        enemyAction(enemy) {
            const player = this.game.state.player;
            this.executeAttack(enemy, player);
            setTimeout(() => this.processTurnEnd(), 500);
        },
        processTurnEnd() {
            this.state.enemies = this.state.enemies.filter(e => e.stats.hp > 0);
            this.state.turnIndex = (this.state.turnIndex + 1) % this.state.turnOrder.length;
            this.state.actionInProgress = false;
            this.nextTurn();
        },
        toggleActionButtons(enabled) { document.querySelectorAll('#combat-action-area button').forEach(btn => btn.disabled = !enabled); },
        executeAttack(attacker, defender) {
            const isHit = (attacker.stats.hit - defender.stats.eva) > Math.random() * 100;
            if (!isHit) {
                this.game.ui.showCombatLogMessage(`${attacker.name} 的攻擊被 ${defender.name} 閃避了！`, 'text-gray-400');
                return;
            }
            let damage = attacker.stats.atk;
            if (attacker.isPlayer && attacker.class === 'monk') {
                damage = Math.floor(attacker.stats.atk * 0.5 + attacker.stats.spi * 0.8);
            }
            damage = Math.max(1, damage - defender.stats.def);
            this.applyDamage(attacker, defender, damage, false);
        },
        executeSkill(attacker, skillId, target) {
            const skillData = DATABASE.skills[skillId];
            const currentLevel = attacker.skills[skillId] || 1;
            const skillInfo = skillData.levels[currentLevel - 1];
    
            if (attacker.stats.mp < skillInfo.mpCost) {
                this.game.ui.showCombatLogMessage('法力不足！', 'text-red-400');
                this.state.actionInProgress = false;
                this.toggleActionButtons(true);
                return;
            }
            attacker.stats.mp -= skillInfo.mpCost || 0;
            this.game.ui.showCombatLogMessage(`${attacker.name} 使用了 ${skillData.name}！`, 'text-cyan-400');
    
            const targets = skillData.targetType === 'all' ? this.state.enemies.filter(e => e.stats.hp > 0) : [target];
            
            targets.forEach(t => {
                if(t && t.stats.hp > 0) {
                    const isMagical = skillData.type === 'magical';
                    const baseStat = isMagical ? attacker.stats.spi : attacker.stats.atk;
                    let damage = Math.floor(baseStat * skillInfo.damageMultiplier);
                    damage = Math.max(1, damage - (isMagical ? t.stats.spi : t.stats.def));
                    this.applyDamage(attacker, t, damage, isMagical);
                }
            });
    
            if (skillInfo.effect) {
                this.applyEffect(attacker, skillInfo.effect);
            }
        },
        applyEffect(target, effect) {
            const existingEffectIndex = target.activeEffects.findIndex(e => e.id === effect.id);
            const newEffect = JSON.parse(JSON.stringify(effect));
            if (existingEffectIndex > -1) {
                target.activeEffects[existingEffectIndex] = newEffect;
            } else {
                target.activeEffects.push(newEffect);
            }
            if (target.isPlayer) {
                this.game.player.recalculateStats();
            }
        },
        applyDamage(attacker, defender, damage, isMagical) {
            if (defender.activeEffects.some(e => e.id === 'unbreakable')) {
                this.game.ui.showCombatLogMessage(`${defender.name} 處於不倒狀態，免疫了所有傷害！`, 'text-green-400');
                return 0;
            }
            
            let finalDamage = damage;
            const isCrit = (attacker.maxStats.critRate || 0) > Math.random() * 100;
            if (isCrit) {
                finalDamage = Math.round(finalDamage * (attacker.maxStats.critDamage / 100));
            }
    
            const oldHp = defender.stats.hp;
            defender.stats.hp = Math.max(0, defender.stats.hp - finalDamage);
            
            this.game.audio.playSound('hit');
            this.game.vfx.play('slash', document.getElementById(`unit-display-${defender.id || 'player'}`));
            
            if (isCrit) this.game.ui.showCombatLogMessage(`💥 暴擊！ ${attacker.name} 對 ${defender.name} 造成了 ${finalDamage} 點傷害。`, 'text-red-500 font-bold');
            else this.game.ui.showCombatLogMessage(`${attacker.name} 對 ${defender.name} 造成了 ${finalDamage} 點傷害。`, isMagical ? 'text-purple-400' : 'text-red-400');
    
            this.game.ui.updateUnitHP(defender, oldHp);
            if (defender.stats.hp <= 0) this.game.ui.showCombatLogMessage(`${defender.name} 被擊敗了！`, 'text-gray-400');
    
            if (attacker.isPlayer) {
                if (attacker.class === 'necromancer') {
                    const healAmount = Math.max(1, Math.floor(finalDamage * 0.10)); // <-- 10% 修正
                    attacker.stats.hp = Math.min(attacker.maxStats.hp, attacker.stats.hp + healAmount);
                    this.game.ui.showCombatLogMessage(`${attacker.name} 透過亡靈之軀恢復了 ${healAmount} 點生命。`, 'text-green-300');
                }
                if (attacker.class === 'orc') {
                    const manaAmount = Math.max(1, Math.floor(finalDamage * 0.10)); // <-- 10% 修正
                    attacker.stats.mp = Math.min(attacker.maxStats.mp, attacker.stats.mp + manaAmount);
                     this.game.ui.showCombatLogMessage(`${attacker.name} 透過野蠻體質吸收了 ${manaAmount} 點法力。`, 'text-blue-300');
                }
                 if (attacker.skills['bloodlust']) {
                    const healAmount = Math.max(1, Math.floor(finalDamage * 0.10));
                    attacker.stats.hp = Math.min(attacker.maxStats.hp, attacker.stats.hp + healAmount);
                }
            }
            return finalDamage;
        },
        end(win, fled = false) {
            const p = this.game.state.player;
            if(p.stats.hp <=0 && p.deathPactAvailable){
                p.deathPactAvailable = false;
                p.stats.hp = p.maxStats.hp;
                p.stats.mp = p.maxStats.mp;
                this.applyEffect(p, {id:'deathPact-buff', name: '死亡契約', type:'buff', stats:{spi:15, speed:5}, turns:99});
                this.game.ui.showCombatLogMessage(`${p.name} 履行了死亡契約，從死亡中歸來！`, 'text-purple-500');
                this.game.ui.renderCombatants();
                return;
            }
            
            this.state.actionInProgress = false;
            this.toggleActionButtons(false);
            this.game.state.isRunning = false;
            this.game.state.canRest = true;
            p.activeEffects = [];
            this.game.player.recalculateStats();
    
            this.game.audio.playMusic('hub');
    
            if (fled) { setTimeout(() => this.game.ui.showScreen('hub-screen'), 1500); return;
            }
            if (win) {
                this.game.audio.playSound('win');
                let totalExp = 0;
                let loot = {};
                
                this.state.defeatedEnemiesInCombat.forEach(enemy => {
                    const originalEnemy = DATABASE.monsters[enemy.id.split('-')[0]];
                    totalExp += originalEnemy.exp;
                    this.game.quests.advance('kill', originalEnemy.id);
                    
                    const dropTable = DATABASE.dropTables[originalEnemy.dropsId] || [];
                    dropTable.forEach(drop => {
                        if (drop.class && !drop.class.includes(this.game.state.player.class)) return;
                        if (Math.random() < drop.chance) {
                            const quantity = Math.floor(Math.random() * (drop.quantity[1] - drop.quantity[0] + 1)) + drop.quantity[0];
                            if(drop.isMoney) {
                                this.game.state.player.gold += quantity;
                                loot['gold'] = (loot['gold'] || 0) + quantity;
                            } else {
                                this.game.player.addItem(drop.itemId, quantity);
                                loot[drop.itemId] = (loot[drop.itemId] || 0) + quantity;
                                this.game.quests.advance('collect', drop.itemId);
                            }
                        }
                    });
                });
    
                if (this.state.defeatedEnemiesInCombat.length > 1) {
                    totalExp = Math.floor(totalExp * 1.5);
                }
                
                this.game.player.addExp(totalExp);
                let lootHTML = Object.keys(loot).map(itemId => {
                    if (itemId === 'gold') return `<p>金錢: ${loot[itemId]}</p>`;
                     const itemData = DATABASE.items[itemId];
                    return `<p><span class="rarity-${itemData.rarity}">${itemData.name}</span> x${loot[itemId]}</p>`;
                }).join('') || '<p>沒有獲得任何物品。</p>';
    
                const continueFn = () => {
                    if (this.game.state.victoryTimeoutId) {
                        clearTimeout(this.game.state.victoryTimeoutId);
                        this.game.state.victoryTimeoutId = null;
                    }
                    this.game.ui.closeModal();
                    this.game.ui.showScreen('hub-screen');
                };
    
                this.game.ui.showModal({
                    title: '<span class="text-green-400">戰鬥勝利！</span>', body: `<p class="text-yellow-400">獲得經驗值: ${totalExp}</p><hr class="my-2 border-gray-600"> ${lootHTML}`,
                    buttons: [{ text: '繼續', fn: continueFn }]
                });
                
                if (this.game.state.victoryTimeoutId) clearTimeout(this.game.state.victoryTimeoutId);
                this.game.state.victoryTimeoutId = setTimeout(() => {
                    if (this.game.state.currentScreen === 'combat-screen') {
                        continueFn();
                    }
                }, 5000);
            } else { 
                this.game.audio.playSound('lose');
                let goldLost = 0;
                let bodyText = `<p>你在城鎮的教會中醒來，僥倖撿回一命。</p>`;
                if(p.class === 'monk'){
                    bodyText += `<p>由於你的信仰，你沒有損失任何金錢。</p>`;
                } else if (p.skills['deathPact'] > 0 && !p.deathPactAvailable) {
                    goldLost = p.gold;
                    p.gold = 0;
                    bodyText += `<p class="text-red-400">契約的反噬讓你遺失了所有金錢 (${goldLost})。</p>`;
                } else {
                    goldLost = Math.floor(p.gold * 0.8);
                    p.gold -= goldLost;
                    bodyText += `<p class="text-red-400">你遺失了 ${goldLost} 金錢。</p>`;
                }
                
                const revive = () => {
                    p.stats.hp = p.maxStats.hp;
                    p.stats.mp = p.maxStats.mp;
                    this.game.ui.closeModal();
                    this.game.ui.showScreen('hub-screen');
                };
                
                this.game.ui.showModal({ 
                    title: '你被擊敗了...', 
                    body: bodyText, 
                    buttons: [{ text: '回到城鎮', fn: revive }]
                });
            }
        }
    },

    vfx: {
        init(gameInstance) { this.game = gameInstance; },
        play(effect, targetElement) {
            if (!targetElement) return;
            const rect = targetElement.getBoundingClientRect();
            const container = document.getElementById('vfx-container');
            const containerRect = container.getBoundingClientRect();
            const vfxEl = document.createElement('div');
            if (effect === 'slash') { vfxEl.className = 'vfx-slash'; } 
            else if (effect === 'heal') { vfxEl.className = 'vfx-heal'; }
            
            vfxEl.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
            vfxEl.style.top = `${rect.top - containerRect.top + rect.height / 2}px`;
            
            container.appendChild(vfxEl);
            setTimeout(() => vfxEl.remove(), 1000);
        }
    },

    saveLoad: {
        init(gameInstance) { this.game = gameInstance; },
        save() {
            if (!this.game.state.player) { 
                this.game.ui.showModal({ title: '存檔失敗', body: '<p>沒有遊戲進度可以儲存。</p>', buttons: [{ text: '關閉', fn: () => this.game.ui.closeModal() }]});
                return; 
            }
            try {
                const saveState = JSON.parse(JSON.stringify(this.game.state));
                delete saveState.currentScreen;
                delete saveState.victoryTimeoutId;
                localStorage.setItem('Echoes-of-Valor-savegame', JSON.stringify(saveState));
                this.game.ui.showModal({ title: '<span class="text-green-400">儲存成功！</span>', body: '<p>你的進度已安全保存在此瀏覽器中。</p>', buttons: [{ text: '好的', fn: () => this.game.ui.closeModal() }]});
                document.getElementById('load-game-btn').disabled = false;
            } catch (e) { 
                console.error("Save failed:", e); 
                this.game.ui.showModal({ title: '<span class="text-red-500">存檔失敗</span>', body: `<p>發生未知錯誤，無法儲存進度。</p><p>${e.message}</p>`, buttons: [{ text: '關閉', fn: () => this.game.ui.closeModal() }]});
            }
        },
        showLoadConfirmationModal() {
            this.game.ui.showModal({
                title: '確定讀取？', body: '<p class="text-gray-400">確定要讀取本機存檔嗎？目前的遊戲進度將會被覆蓋。</p>', 
                buttons: [{ text: '取消', fn: () => this.game.ui.closeModal() }, { text: '確定', fn: () => {this.game.ui.closeModal(); this.load();}, class: 'bg-red-600 hover:bg-red-700 text-white' }]
            });
        },
        load() {
            const savedData = localStorage.getItem('Echoes-of-Valor-savegame');
            if (!savedData) {
                this.game.ui.showModal({ title: '找不到存檔', body: '<p>此瀏覽器沒有找到你的遊戲存檔。</p>', buttons: [{ text: '返回', fn: () => this.game.ui.closeModal() }]});
                return;
            }
            try {
                const loadedState = JSON.parse(savedData);
                loadedState.isRunning = false;
                loadedState.currentScreen = 'hub-screen';
                loadedState.victoryTimeoutId = null;
                if (!loadedState.player.completedQuests) loadedState.player.completedQuests = [];
                if (loadedState.player.equipment && !loadedState.player.equipment.boots) loadedState.player.equipment.boots = null;
                
                this.game.state = loadedState;
                this.game.ui.showScreen('hub-screen');
            } catch(e) { 
                console.error("Load failed:", e);
                this.game.ui.showModal({ title: '<span class="text-red-500">讀取失敗</span>', body: `<p>存檔檔案已損毀，無法讀取。</p><p>${e.message}</p>`, buttons: [{ text: '關閉', fn: () => this.game.ui.closeModal() }]});
            }
        }
    },

    audio: {
        init(gameInstance) { this.game = gameInstance; },
        isInitialized: false, sounds: {}, music: {},
        async setup() {
            if (this.isInitialized) return;
            try {
                await Tone.start();
                this.sounds.click = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination();
                this.sounds.attack = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 } }).toDestination();
                this.sounds.hit = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).toDestination();
                this.sounds.skill = new Tone.PluckSynth({ attackNoise: 0.5, dampening: 4000, resonance: 0.7 }).toDestination();
                this.sounds.levelUp = new Tone.FatOscillator("Ab3", "sawtooth", 40).toDestination();
                this.sounds.heal = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.5 } }).toDestination();
                this.sounds.equip = new Tone.MetalSynth({ frequency: 150, envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 3.1, modulationIndex: 16, resonance: 4000, octaves: 0.5 }).toDestination();
                this.sounds.win = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0, release: 0.1 } }).toDestination();
                this.sounds.lose = new Tone.Synth({ oscillator: { type: 'fatsawtooth' }, envelope: { attack: 0.2, decay: 0.8, sustain: 0, release: 0.2 } }).toDestination();
                
                const hubSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' } }).toDestination();
                hubSynth.volume.value = -12;
                const hubMelody = ["G4", "B4", "D5", "B4", "C5", "A4", "G4", "A4", "E4", "G4", "C5", "G4", "F#4", "G4", "A4", "G4"];
                this.music.hub = new Tone.Sequence((time, note) => {
                    if(note) hubSynth.triggerAttackRelease(note, "8n", time);
                }, hubMelody, "8n");
    
                const combatSynth = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.3, release: 0.2 }, filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, baseFrequency: 200, octaves: 3 } }).toDestination();
                combatSynth.volume.value = -10;
                this.music.combat = new Tone.Sequence((time, note) => {
                    if(note) combatSynth.triggerAttackRelease(note, '8n', time);
                }, ['C3', null, 'C#3', 'D3', 'C3', null, 'C#3', 'D3', 'G2', null, 'G#2', 'A2', 'G2', null, 'G#2', 'A2'], '16n');
                
                Tone.Transport.bpm.value = 130;
                this.isInitialized = true;
            } catch (e) {
                console.error("Audio context could not be started:", e);
            }
        },
        playSound(sound) {
            if (!this.isInitialized) return;
            switch(sound) {
                case 'click': this.sounds.click.triggerAttackRelease('C2', '8n'); break;
                case 'attack': this.sounds.attack.triggerAttackRelease('C5', '8n'); break;
                case 'hit': this.sounds.hit.triggerAttackRelease('C3', '8n'); break;
                case 'skill': this.sounds.skill.triggerAttackRelease('G4', '8n'); break;
                case 'levelUp': this.sounds.levelUp.triggerAttackRelease('C4', '0.5'); break;
                case 'heal': this.sounds.heal.triggerAttackRelease('A4', '4n'); break;
                case 'equip': this.sounds.equip.triggerAttackRelease('C5', '32n'); break;
                case 'win':
                    this.sounds.win.triggerAttackRelease('C5', '8n', Tone.now());
                    this.sounds.win.triggerAttackRelease('E5', '8n', Tone.now() + 0.2);
                    this.sounds.win.triggerAttackRelease('G5', '4n', Tone.now() + 0.4);
                    break;
                case 'lose': this.sounds.lose.triggerAttackRelease('C3', '1'); break;
            }
        },
        playMusic(track) {
            if (!this.isInitialized || !this.music[track]) return;
            Tone.Transport.stop();
            Tone.Transport.cancel();
            
            if (this.music[track]) { 
                this.music[track].start(0);
                Tone.Transport.start();
            }
        },
        stopMusic() {
            if (!this.isInitialized) return;
            Tone.Transport.stop();
            Tone.Transport.cancel();
        }
    }
};

// 最後，啟動遊戲
window.addEventListener('DOMContentLoaded', () => {
    game.init();
});
