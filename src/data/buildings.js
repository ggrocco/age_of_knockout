// UNVERIFIED approximations of AoE1 values. buildTime in sec (single builder).
import { TOWER, WALL_HP } from './defences.js';
const c = (food = 0, wood = 0, gold = 0, stone = 0) => ({ food, wood, gold, stone });
export const BUILDINGS = {
  town_center:       { name: 'Town Center', hp: 600, cost: c(0, 200, 0, 100), size: 3, buildTime: 60, age: 'stone', trains: ['villager'], drops: ['food', 'wood', 'gold', 'stone'], pop: 10, sight: 8 },
  house:             { name: 'House', hp: 75, cost: c(0, 30), size: 2, buildTime: 15, age: 'stone', pop: 4, sight: 3 },
  granary:           { name: 'Granary', hp: 200, cost: c(0, 120), size: 2, buildTime: 25, age: 'stone', drops: ['food'], sight: 4 },
  storage_pit:       { name: 'Storage Pit', hp: 200, cost: c(0, 120), size: 2, buildTime: 25, age: 'stone', drops: ['wood', 'gold', 'stone'], sight: 4 },
  farm:              { name: 'Farm', hp: 50, cost: c(0, 60), size: 2, buildTime: 15, age: 'stone', gatherType: 'food', sight: 2, extra: true }, // holds and yields more each era (farms.js)
  // Invented. Only on ore ground: what it yields (gatherType) and how much is left (amount) come from the patch under it (sim/ore.js).
  mine:              { name: 'Mine', hp: 150, cost: c(0, 100, 0, 50), size: 2, buildTime: 30, age: 'tool', sight: 3, extra: true, ore: true },
  barracks:          { name: 'Barracks', hp: 350, cost: c(0, 125), size: 3, buildTime: 30, age: 'stone', trains: ['clubman', 'slinger', 'axeman', 'spearman', 'hoplite', 'swordsman', 'musketeer', 'rifleman', 'machine_gunner', 'mech'], sight: 4 },
  archery_range:     { name: 'Archery Range', hp: 350, cost: c(0, 150), size: 3, buildTime: 40, age: 'tool', trains: ['bowman', 'crossbowman', 'drone'], sight: 4 },
  stable:            { name: 'Stable', hp: 350, cost: c(0, 150), size: 3, buildTime: 40, age: 'tool', trains: ['scout', 'horse_archer', 'knight'], sight: 4 },
  market:            { name: 'Market', hp: 350, cost: c(0, 150), size: 3, buildTime: 40, age: 'tool', sight: 4 },
  government_center: { name: 'Government Center', hp: 500, cost: c(0, 175, 0, 100), size: 3, buildTime: 60, age: 'bronze', trains: ['catapult', 'railgun'], drops: ['food', 'wood', 'gold', 'stone'], sight: 5 },
  castle:            { name: 'Castle', hp: 1200, cost: c(0, 300, 0, 300), size: 4, buildTime: 90, age: 'medieval', trains: ['trebuchet', 'cannon'], sight: 7, marmor: 6, parmor: 10 },
  factory:           { name: 'Factory', hp: 700, cost: c(0, 250, 150, 50), size: 3, buildTime: 60, age: 'industrial', trains: ['field_artillery', 'tank'], sight: 5 },
  // Defences (invented). `hp` here is the Tool-era value; addBuilding takes the real HP and the tower's attack from the owner's era (defences.js).
  tower:             { name: 'Tower', hp: TOWER.tool.hp, cost: c(0, 40, 0, 120), size: 2, buildTime: 40, age: 'tool', sight: 10, extra: true, defence: 'tower' },
  wall:              { name: 'Wall', hp: WALL_HP.tool, cost: c(0, 0, 0, 5), size: 1, buildTime: 6, age: 'tool', sight: 2, extra: true, defence: 'wall', marmor: 4, parmor: 10 },
  wonder:            { name: 'Wonder', hp: 1500, cost: c(0, 1000, 1000, 1000), size: 4, buildTime: 200, age: 'bronze', sight: 6, extra: true },
};
// Repairing (invented, AoE2-style): villagers put a finished building's lost HP back at the speed they would build it,
// and full repair costs this share of its build cost, paid as the HP goes back on.
export const REPAIR_COST = 0.5;
// What putting `hp` HP back on a building of `type` with `maxHp` costs.
export const repairCost = (type, hp, maxHp) => Object.fromEntries(Object.entries(BUILDINGS[type].cost).map(([k, v]) => [k, v * REPAIR_COST * hp / maxHp]));
// Damage slows a building's production (invented): it trains and researches at its share of full HP, never below
// DAMAGED_MIN_SPEED, and is back to full speed once repaired.
export const DAMAGED_MIN_SPEED = 0.25;
export const workSpeed = b => Math.max(DAMAGED_MIN_SPEED, Math.min(1, b.hp / b.maxHp));
