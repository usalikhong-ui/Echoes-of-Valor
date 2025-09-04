export const locations = {
    oakwood: { name: "橡木鎮", description: "一個被森林環繞的寧靜小鎮，但最近似乎不太平靜。" },
    whisperingWoods: { name: "低語森林", description: "新手冒險者的試煉場，充滿了哥布林與野生動物。", monsters: ['slime', 'goblin', 'forestSpider', 'giantBat', 'kobold'], levelRange: [1, 4], requiredLevel: 1, storyReq: 'main01' },
    boarPlains: { name: "野豬平原", description: "開闊的平原，是野豬和狼群的家園。", monsters: ['wildBoar', 'wolf', 'bandit'], levelRange: [3, 6], requiredLevel: 3, storyReq: 'main03' },
    goblinCamp: { name: "哥布林營地", description: "哥布林們聚集的營地，由更強大的戰士守衛著。", monsters: ['goblinWarrior', 'hobgoblin', 'goblinLeader'], levelRange: [5, 8], requiredLevel: 5, storyReq: 'main03' },
    orcOutpost: { name: "獸人前哨", description: "獸人部落的前線哨站，瀰漫著戰爭的氣息。", monsters: ['orcGrunt', 'orcShaman', 'ogre'], levelRange: [7, 14], requiredLevel: 8, storyReq: 'main04' },
    hauntedCemetery: { name: '荒廢墓園', description: "不安的靈魂在此徘徊，生者勿近的詛咒之地。", monsters: ['skeleton', 'zombie', 'wraith', 'ghoul', 'spirit'], levelRange: [8, 12], requiredLevel: 10, storyReq: 'main05' },
};

export const shop = {
    inventory: {
        main01: ['healingEgg', 'manaTea', 'antidote', 'smallSword', 'monksGloves', 'orcishAxe', 'boneWand', 'leatherArmor', 'courageBadge', 'travelersBoots'],
        main03: ['healingPotion', 'manaPotion', 'smokeBomb', 'fineLongsword', 'acolyteBeads', 'boneCrusher', 'specterWand', 'chainmail', 'mageRobe'],
        main05: ['hiHealingPotion', 'hiManaPotion','stoneSkinPotion', 'swiftnessPotion', 'giantsElixir', 'knightSword', 'ironFist', 'spikedClub', 'ritualDagger', 'plateArmor']
    }
};

export const dropTables = {
    L001: [ { itemId: 'brokenFabric', chance: 0.5, quantity: [1, 2] }, { itemId: 'healingEgg', chance: 0.3, quantity: [1, 1] }, { itemId: 'gold', chance: 1, quantity: [5, 10], isMoney: true }],
    // ... 將 database.js -> dropTables 的所有掉落資料複製到這裡 ...
    L012: [ { itemId: 'wolfFang', chance: 0.6, quantity: [2, 4]}, { itemId: 'travelersBoots', chance: 0.1, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [60, 100], isMoney: true}],
    L013: [], L014: [], L015: [], L016: [], L017: [], L018: [], L019: [], L020: [], L021: [], L022: [], L023: [], L024: [],
};