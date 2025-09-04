// database.js

import { classes, classGrowth } from './classes.js';
import { monsters } from './monsters.js';
import { skills } from './skills.js';
import { items } from './items.js';
// 【修正】在這裡同時導入 storyline
import { quests, npcs, storyline } from './quests.js';
import { locations, shop, dropTables } from './locations.js';

export const LOCALIZATION_MAP = {
    stats: {
        hp: '生命', mp: '法力', atk: '攻擊', def: '防禦',
        spi: '靈力', hit: '命中', eva: '閃避',
        critRate: '暴擊率', critDamage: '暴傷', speed: '速度'
    },
    ui: {
        confirm: '確認', cancel: '取消', back: '返回',
        equipped: '已裝備', learn: '學習', upgrade: '升級'
    }
};

export const DATABASE = {
    classes,
    classGrowth,
    monsters,
    items,
    skills,
    locations,
    npcs,
    quests,
    shop,
    dropTables,
    // 【修正】將 storyline 正確地放入 DATABASE
    storyline, 
    codex: {
        monsters: Object.keys(monsters),
        items: Object.values(items).filter(i => ['consumable', 'material', 'skillbook'].includes(i.type)).map(i => i.id),
        weapons: Object.values(items).filter(i => i.type === 'weapon').map(i => i.id),
        armors: Object.values(items).filter(i => ['armor', 'accessory', 'boots'].includes(i.type)).map(i => i.id),
    }
};
