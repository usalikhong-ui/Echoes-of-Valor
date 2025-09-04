export const monsters = {
    slime: { id: 'slime', name: "史萊姆", level: 1, stats: { hp: 20, mp: 0, atk: 7, def: 7, spi: 2, hit: 5, eva: 3, speed: 7, critRate: 0, critDamage: 100 }, exp: 18, dropsId: 'L001', skills: []},
    goblin: { id: 'goblin', name: "哥布林", level: 2, stats: { hp: 38, mp: 5, atk: 10, def: 8, spi: 5, hit: 7, eva: 8, speed: 12, critRate: 5, critDamage: 120 }, exp: 30, dropsId: 'L002', skills: ['goblinRush']},
    // ... 將 database.js -> monsters 的所有怪物資料複製到這裡 ...
    titan: { id: 'titan', name: '泰坦', level: 45, stats: { hp: 8000, mp: 300, atk: 300, def: 200, spi: 100, hit: 40, eva: 15, speed: 25, critRate: 15, critDamage: 180 }, exp: 15000, dropsId: 'L024', skills: ['earthSlam', 'ogreClub'], isBoss: true },
};