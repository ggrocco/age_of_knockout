// Combat/cost stats verified against openage AoE1 manual data (unit_stats_aoe.csv);
// deviations recorded in README.md. speed = tiles/sec, range = tiles, trainTime = sec.
const c = (food = 0, wood = 0, gold = 0, stone = 0) => ({ food, wood, gold, stone });
export const UNITS = {
  villager:     { name: 'Villager', hp: 25, atk: 3, atkType: 'melee', marmor: 0, parmor: 0, range: 0.9, speed: 1.6, cost: c(50), trainTime: 20, age: 'stone', sight: 5, cls: 'civ' },
  clubman:      { name: 'Clubman', hp: 40, atk: 3, atkType: 'melee', marmor: 0, parmor: 0, range: 0.9, speed: 1.7, cost: c(50), trainTime: 27, age: 'stone', sight: 5, cls: 'inf' },
  axeman:       { name: 'Axeman', hp: 50, atk: 5, atkType: 'melee', marmor: 0, parmor: 0, range: 0.9, speed: 1.7, cost: c(50), trainTime: 27, age: 'tool', sight: 5, cls: 'inf' },
  slinger:      { name: 'Slinger', hp: 25, atk: 3, atkType: 'pierce', marmor: 0, parmor: 0, range: 6, speed: 1.7, cost: c(40, 0, 0, 10), trainTime: 26, age: 'stone', sight: 7, cls: 'archer' },
  bowman:       { name: 'Bowman', hp: 35, atk: 3, atkType: 'pierce', marmor: 0, parmor: 0, range: 5, speed: 1.7, cost: c(40, 20), trainTime: 30, age: 'tool', sight: 7, cls: 'archer' },
  spearman:     { name: 'Spearman', hp: 60, atk: 6, atkType: 'melee', marmor: 1, parmor: 0, bonus: { cav: 8 }, range: 0.9, speed: 1.7, cost: c(50, 30), trainTime: 26, age: 'tool', sight: 5, cls: 'inf' },
  hoplite:      { name: 'Hoplite', hp: 120, atk: 17, atkType: 'melee', marmor: 5, parmor: 0, range: 0.9, speed: 1.6, cost: c(60, 0, 40), trainTime: 36, age: 'bronze', sight: 5, cls: 'inf' },
  swordsman:    { name: 'Swordsman', hp: 160, atk: 13, atkType: 'melee', marmor: 2, parmor: 0, range: 0.9, speed: 1.6, cost: c(60, 0, 40), trainTime: 27, age: 'iron', sight: 5, cls: 'inf' },
  scout:        { name: 'Scout', hp: 60, atk: 3, atkType: 'melee', marmor: 0, parmor: 0, bonus: { inf: 5 }, range: 0.9, speed: 3.2, cost: c(100), trainTime: 30, age: 'tool', sight: 8, cls: 'cav' },
  horse_archer: { name: 'Horse Archer', hp: 60, atk: 7, atkType: 'pierce', marmor: 0, parmor: 2, range: 7, speed: 2.8, cost: c(50, 0, 70), trainTime: 40, age: 'bronze', sight: 9, cls: 'cav' },
  catapult:     { name: 'Catapult', hp: 75, atk: 60, atkType: 'melee', marmor: 0, parmor: 0, range: 9, speed: 0.9, cost: c(0, 180, 80), trainTime: 60, age: 'iron', sight: 8, cls: 'siege', splash: 1.5 },
  knight:       { name: 'Knight', hp: 140, atk: 12, atkType: 'melee', marmor: 3, parmor: 2, range: 0.9, speed: 2.4, cost: c(60, 0, 75), trainTime: 30, age: 'medieval', sight: 6, cls: 'cav' },
  crossbowman:  { name: 'Crossbowman', hp: 45, atk: 6, atkType: 'pierce', marmor: 0, parmor: 0, range: 6, speed: 1.7, cost: c(40, 30, 20), trainTime: 27, age: 'medieval', sight: 8, cls: 'archer' },
  trebuchet:    { name: 'Trebuchet', hp: 120, atk: 70, atkType: 'melee', marmor: 0, parmor: 0, range: 10, speed: 0.6, cost: c(0, 200, 120), trainTime: 60, age: 'medieval', sight: 9, cls: 'siege', splash: 1.5 },
  musketeer:    { name: 'Musketeer', hp: 60, atk: 10, atkType: 'pierce', marmor: 1, parmor: 0, range: 5, speed: 1.6, cost: c(60, 0, 40), trainTime: 30, age: 'sail', sight: 7, cls: 'archer' },
  cannon:       { name: 'Cannon', hp: 130, atk: 75, atkType: 'melee', marmor: 0, parmor: 0, range: 9, speed: 0.8, cost: c(0, 150, 150), trainTime: 55, age: 'sail', sight: 9, cls: 'siege', splash: 1.3 },
  rifleman:     { name: 'Rifleman', hp: 70, atk: 12, atkType: 'pierce', marmor: 1, parmor: 1, range: 7, speed: 1.7, cost: c(70, 0, 50), trainTime: 30, age: 'industrial', sight: 8, cls: 'archer' },
  field_artillery: { name: 'Field Artillery', hp: 150, atk: 80, atkType: 'melee', marmor: 0, parmor: 0, range: 10, speed: 0.9, cost: c(0, 180, 180), trainTime: 60, age: 'industrial', sight: 9, cls: 'siege', splash: 1.5 },
  machine_gunner: { name: 'Machine Gunner', hp: 90, atk: 5, atkType: 'pierce', marmor: 1, parmor: 2, range: 6, speed: 1.5, cost: c(80, 0, 60), trainTime: 32, age: 'modern', sight: 8, cls: 'archer', cooldown: 12 },
  tank:         { name: 'Tank', hp: 240, atk: 22, atkType: 'melee', marmor: 4, parmor: 6, range: 5, speed: 1.8, cost: c(150, 0, 150), trainTime: 45, age: 'modern', sight: 8, cls: 'armor', cooldown: 40 },
  drone:        { name: 'Combat Drone', hp: 45, atk: 6, atkType: 'pierce', marmor: 0, parmor: 1, range: 7, speed: 3.0, cost: c(60, 0, 80), trainTime: 28, age: 'future', sight: 9, cls: 'archer' },
  mech:         { name: 'Mech Walker', hp: 200, atk: 20, atkType: 'melee', marmor: 5, parmor: 3, range: 0.9, speed: 1.5, cost: c(120, 0, 90), trainTime: 36, age: 'future', sight: 6, cls: 'inf' },
  railgun:      { name: 'Railgun', hp: 90, atk: 80, atkType: 'pierce', marmor: 0, parmor: 0, range: 11, speed: 1.0, cost: c(0, 120, 150), trainTime: 55, age: 'future', sight: 9, cls: 'siege', splash: 1.2 },
  king:         { name: 'King', hp: 120, atk: 5, atkType: 'melee', marmor: 2, parmor: 0, range: 0.9, speed: 1.4, cost: c(), trainTime: 1, age: 'stone', sight: 6, cls: 'civ', trainable: false },
};
