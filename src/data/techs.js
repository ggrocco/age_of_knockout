// Researchable upgrades. The *mechanic* (research at a building, global effect) follows AoE1;
// the military tech names echo AoE1's Storage Pit / Government Center tiers, but the exact costs,
// research times and placements are game-tuned approximations (openage's docs do not contain a
// clean AoE1 tech tree — see src/data/README.md). The Storage Pit has at least one upgrade in every era, Stone to AI
// Future, listed in era order (the HUD shows them in this order); from Steel Weapons on they have no AoE1 counterpart.
//
// effect shapes (all applied exactly once per unit — at spawn and at completion):
//   { cls: ['inf','cav'], atk: 2 }            -> +atk to units of those classes
//   { cls: ['inf'], marmor: 1, parmor: 1 }    -> +armor
//   { cls: ['archer','siege'], range: 1 }     -> +range
//   { cls: ['inf'], hp: 20 }                  -> +max HP (and the same HP now)
//   { speedMul: 1.1 }                         -> multiplies move speed (no cls: every unit)
//   { gather: { wood: 1.25 } }                -> multiplies a player's gather rate (not per-unit)
// c(food, wood, gold, stone): a cost, any amount left out is 0.
const c = (food = 0, wood = 0, gold = 0, stone = 0) => ({ food, wood, gold, stone });

export const TECHS = {
  // --- Storage Pit: weapons and armor ---
  hide_armor: { name: 'Hide Armor', building: 'storage_pit', age: 'stone', cost: c(50, 50), time: 25,
    effect: { cls: ['inf', 'archer'], parmor: 1 }, desc: 'Infantry and ranged foot units gain +1 pierce armor.' },
  bronze_weapons: { name: 'Bronze Weapons', building: 'storage_pit', age: 'tool', cost: c(80, 0, 40), time: 40,
    effect: { cls: ['inf', 'cav'], atk: 2 }, desc: 'Infantry and cavalry deal +2 attack.' },
  bronze_shields: { name: 'Bronze Shields', building: 'storage_pit', age: 'tool', cost: c(0, 60, 60), time: 40,
    effect: { cls: ['inf'], marmor: 1, parmor: 1 }, desc: 'Infantry gain +1 melee and +1 pierce armor.' },
  iron_weapons: { name: 'Iron Weapons', building: 'storage_pit', age: 'bronze', cost: c(120, 0, 80), time: 50, requires: 'bronze_weapons',
    effect: { cls: ['inf', 'cav'], atk: 2 }, desc: 'Infantry and cavalry deal +2 more attack. Needs Bronze Weapons.' },
  scale_barding: { name: 'Scale Barding', building: 'storage_pit', age: 'bronze', cost: c(100, 0, 60), time: 40,
    effect: { cls: ['cav'], marmor: 1, parmor: 1 }, desc: 'Cavalry gain +1 melee and +1 pierce armor.' },
  steel_weapons: { name: 'Steel Weapons', building: 'storage_pit', age: 'iron', cost: c(150, 0, 100), time: 50, requires: 'iron_weapons',
    effect: { cls: ['inf', 'cav'], atk: 2 }, desc: 'Infantry and cavalry deal +2 more attack. Needs Iron Weapons.' },
  plate_armor: { name: 'Plate Armor', building: 'storage_pit', age: 'medieval', cost: c(180, 0, 120), time: 55,
    effect: { cls: ['inf', 'cav'], marmor: 2, parmor: 1 }, desc: 'Infantry and cavalry gain +2 melee and +1 pierce armor.' },
  paper_cartridges: { name: 'Paper Cartridges', building: 'storage_pit', age: 'sail', cost: c(150, 50, 120), time: 50,
    effect: { cls: ['archer'], atk: 1 }, desc: 'Ranged foot units (archers, musketeers, gunners, drones) deal +1 attack.' },
  rifled_barrels: { name: 'Rifled Barrels', building: 'storage_pit', age: 'industrial', cost: c(180, 0, 150), time: 55, requires: 'paper_cartridges',
    effect: { cls: ['archer'], atk: 1 }, desc: 'Ranged foot units deal +1 more attack. Needs Paper Cartridges.' },
  composite_armor: { name: 'Composite Armor', building: 'storage_pit', age: 'modern', cost: c(200, 0, 180), time: 60,
    effect: { cls: ['armor'], marmor: 2, parmor: 2 }, desc: 'Tanks and Armored Trains gain +2 melee and +2 pierce armor.' },
  nanoweave_plating: { name: 'Nanoweave Plating', building: 'storage_pit', age: 'future', cost: c(220, 0, 200), time: 65,
    effect: { cls: ['inf', 'cav', 'archer', 'armor'], marmor: 1, parmor: 2 }, desc: 'Infantry, cavalry, ranged foot units, Tanks and Armored Trains gain +1 melee and +2 pierce armor.' },

  // --- Government Center: military ---
  ballistics: { name: 'Ballistics', building: 'government_center', age: 'bronze', cost: c(0, 80, 120), time: 45,
    effect: { cls: ['archer', 'siege'], range: 1 }, desc: 'Archers and siege engines gain +1 range.' },

  // --- Market: economy ---
  woodworking: { name: 'Woodworking', building: 'market', age: 'tool', cost: c(0, 0, 75), time: 30,
    effect: { gather: { wood: 1.25 } }, desc: 'Villagers gather wood 25% faster.' },
  gold_mining: { name: 'Gold Mining', building: 'market', age: 'tool', cost: c(120, 0, 0), time: 30,
    effect: { gather: { gold: 1.25 } }, desc: 'Villagers mine gold 25% faster.' },

  // --- Gate buildings (invented, one upgrade each; see src/data/README.md) ---
  sacred_harvest: { name: 'Sacred Harvest', building: 'temple', age: 'bronze', cost: c(0, 120, 80), time: 40,
    effect: { gather: { food: 1.2 } }, desc: 'Villagers gather food 20% faster.' },
  phalanx_drill: { name: 'Phalanx Drill', building: 'academy', age: 'iron', cost: c(120, 0, 80), time: 45,
    effect: { cls: ['inf'], hp: 20 }, desc: 'Infantry gain +20 HP.' },
  torsion_engines: { name: 'Torsion Engines', building: 'siege_workshop', age: 'iron', cost: c(0, 150, 120), time: 50,
    effect: { cls: ['siege'], atk: 10 }, desc: 'Siege engines and guns deal +10 attack.' },
  masonry: { name: 'Masonry', building: 'university', age: 'medieval', cost: c(100, 100), time: 40,
    effect: { gather: { stone: 1.25 } }, desc: 'Villagers quarry stone 25% faster.' },
  bayonets: { name: 'Bayonets', building: 'arsenal', age: 'sail', cost: c(150, 0, 120), time: 50,
    effect: { cls: ['archer'], marmor: 2 }, desc: 'Ranged foot units (archers, musketeers, gunners, drones) gain +2 melee armor.' },
  colonial_trade: { name: 'Colonial Trade', building: 'trading_company', age: 'sail', cost: c(200, 150), time: 45,
    effect: { gather: { gold: 1.2 } }, desc: 'Villagers mine gold 20% faster.' },
  railways: { name: 'Railways', building: 'railway_station', age: 'industrial', cost: c(200, 0, 200), time: 55,
    effect: { speedMul: 1.1 }, desc: 'Every unit moves 10% faster.' },
  electrification: { name: 'Electrification', building: 'power_plant', age: 'modern', cost: c(250, 0, 200), time: 55,
    effect: { gather: { food: 1.1, wood: 1.1, gold: 1.1, stone: 1.1 } }, desc: 'Villagers gather every resource 10% faster.' },
  air_support: { name: 'Air Support', building: 'airfield', age: 'modern', cost: c(200, 0, 250), time: 60,
    effect: { cls: ['armor', 'siege'], hp: 30 }, desc: 'Tanks, Armored Trains and siege gain +30 HP.' },
};

// Apply a unit effect to one unit. Idempotent per tech: called once when the unit spawns and once
// when a tech completes for existing units, so each unit receives each tech exactly once.
export function applyUnitEffect(unit, effect) {
  if (!effect || effect.gather) return;
  if (effect.cls && !effect.cls.includes(unit.cls)) return;
  if (effect.atk) unit.atk += effect.atk;
  if (effect.marmor) unit.marmor += effect.marmor;
  if (effect.parmor) unit.parmor += effect.parmor;
  if (effect.range) unit.range += effect.range;
  if (effect.hp) {
    unit.maxHp += effect.hp;
    unit.hp += effect.hp;
  }
  if (effect.speedMul) unit.speed *= effect.speedMul;
}
