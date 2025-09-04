export const skills = {
    // --- 劍客 (Swordsman) ---
    slash: { name: '斬擊', class:'swordsman', category: '攻擊', type: 'physical', targetType: 'single', maxLevel: 3, levelReq: 1, 
        levels: [
            { mpCost: 5, damageMultiplier: 1.5, description: '[單體] 對單一敵人造成<span class="text-yellow-400">150%</span>攻擊力的物理傷害。' },
            { mpCost: 6, damageMultiplier: 1.65, description: '[單體] 對單一敵人造成<span class="text-yellow-400">165%</span>攻擊力的物理傷害。' },
            { mpCost: 7, damageMultiplier: 1.7, effect: { id: 'slash-buff', name: '斬擊強化', type: 'buff', stat: 'atk', value: 15, turns: 2 }, description: '[單體] 造成<span class="text-yellow-400">170%</span>物理傷害，並提升自身<span class="text-green-400">15</span>點攻擊力，持續2回合。' },
    ]},
    // ... 將你舊的 skills.js 裡的所有技能資料複製到這裡 ...
    deathPact: { name: '死亡契約', class:'necromancer', category: '被動', type: 'passive', maxLevel: 1, levelReq: 27,
        levels: [{ description: '[被動] 死亡時，原地滿血法復活，並提升<span class="text-green-400">15</span>靈力與<span class="text-green-400">5</span>速度(每場戰鬥一次)，再次死亡將損失<span class="text-red-500">所有</span>金錢。'}]}
};