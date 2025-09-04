// quests.js

export const npcs = {
    elder: { name: "村長", type: "quest" },
    blacksmith: { name: "鐵匠", type: "quest" }
};

// 【修正】將遺漏的 storyline 物件加回到這個檔案
export const storyline = {
    main01: { title: '第一章：低語的先兆', description: '調查橡木鎮水源污染的源頭。' },
    main02: { title: '第二章：磨練自我', description: '學會利用裝備來強化自己。' },
    main03: { title: '第三章：實力證明', description: '透過實戰來證明自己的實力。' },
    main04: { title: '第四章：部落的威脅', description: '擊退入侵的獸人步兵。' },
    main05: { title: '第五章：安撫亡魂', description: '淨化墓園中的怨靈。' },
    main06: { title: '第六章：迎接挑戰', description: '為更艱鉅的挑戰做好準備。' },
};

export const quests = {
    main01: { id: 'main01', title: "森林裡的麻煩", npc: "elder", objective: { type: 'kill', target: 'goblin', current: 0, total: 5 }, reward: { exp: 150, items: [{ itemId: 'healingEgg', quantity: 5 }], gold: 50, skillPoints: 1 }, levelReq: 1, onComplete: (p) => { p.storyProgress = 'main02'; } },
    main02: { id: 'main02', title: "第一次裝備", npc: "blacksmith", objective: { type: 'equip', target: 'any', current: 0, total: 1 }, reward: { exp: 50, items: [{ itemId: 'courageBadge', quantity: 1 }], gold: 20 }, levelReq: 1, onComplete: (p) => { p.storyProgress = 'main03'; } },
    main03: { id: 'main03', title: "等級的考驗", npc: "elder", objective: { type: 'level', target: 'any', current: 0, total: 5 }, reward: { exp: 200, items: [{ itemId: 'giantsElixir', quantity: 3 }], gold: 100 }, levelReq: 3, onComplete: (p) => { p.storyProgress = 'main04'; } },
    main04: { id: 'main04', title: "深入獸人領地", npc: "elder", objective: { type: 'kill', target: 'orcGrunt', current: 0, total: 8 }, 
        reward: { exp: 500, items: [{ classSpecific: true, swordsman: 'legionCommanderSword', monk: 'acolyteBeads', orc: 'boneCrusher', necromancer: 'specterWand' }], gold: 250 }, 
        levelReq: 8, onComplete: (p) => { p.storyProgress = 'main05'; } 
    },
    main05: { id: 'main05', title: "亡靈的呢喃", npc: "elder", objective: { type: 'kill', target: 'wraith', current: 0, total: 3 }, 
        reward: { exp: 800, items: [{ classSpecific: true, swordsman: 'chainmail', monk: 'mageRobe', orc: 'chainmail', necromancer: 'mageRobe' }], gold: 500 }, 
        levelReq: 10, onComplete: (p) => { p.storyProgress = 'main06'; } 
    },
    main06: { id: 'main06', title: "最終的挑戰", npc: "elder", objective: { type: 'level', target: 'any', current: 0, total: 15 }, reward: { exp: 1500, gold: 1000, skillPoints: 3 }, levelReq: 13, onComplete: (p) => {} },
};
