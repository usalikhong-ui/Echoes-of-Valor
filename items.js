export const items = {
    // [內容擴充] 新增分級藥水
    healingEgg: { id: 'healingEgg', name: '補血蛋', type: 'consumable', effect: { type: 'heal_hp', value: 50 }, description: '恢復50點生命值。', value: 10, rarity: 'common', specialEffect: null},
    // ... 將 database.js -> items 的所有物品資料複製到這裡 ...
    // 我已經為所有物品加上 specialEffect: null，方便你未來擴充
    staffOfApocalypse: { id: 'staffOfApocalypse', name: '天啟法杖', type: 'weapon', slot: 'weapon', class: ['necromancer'], stats: { spi: 65, eva: 10 }, description: '據說能引發末日，帶來死亡與毀滅。', value: 12000, rarity: 'epic', specialEffect: null },
    // ...
    skillBookDemoralizingShout: { id: 'skillBookDemoralizingShout', name: '戰吼之書:挑撥', type: 'skillbook', skillId: 'demoralizingShout', class: ['orc'], description: '教你如何用言語激怒敵人。', value: 800, rarity: 'uncommon', specialEffect: null },
    // ...
    ectoplasm: { id: 'ectoplasm', name: '靈質', type: 'material', description: '靈體生物留下的殘餘物。', value: 20, rarity: 'uncommon', specialEffect: null },
};