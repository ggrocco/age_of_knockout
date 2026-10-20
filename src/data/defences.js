// Tower and Wall stats by era (invented, game-tuned: see src/data/README.md "Invented content (defences)").
// A defence takes its numbers from its owner's era at the moment it is built. Eras before Tool use the Tool row.
// Tower attack type: 'pierce' (arrows, bullets, beams) or 'melee' (the heavy shot of the sail and modern towers).
export const TOWER = {
  tool:       { hp: 125, atk: 3,  atkType: 'pierce', range: 5, cooldown: 40 },
  bronze:     { hp: 160, atk: 4,  atkType: 'pierce', range: 6, cooldown: 40 },
  iron:       { hp: 220, atk: 7,  atkType: 'pierce', range: 7, cooldown: 40 },
  medieval:   { hp: 280, atk: 9,  atkType: 'pierce', range: 7, cooldown: 40 },
  sail:       { hp: 340, atk: 16, atkType: 'melee',  range: 8, cooldown: 60, splash: 0.8 },
  industrial: { hp: 380, atk: 4,  atkType: 'pierce', range: 7, cooldown: 12 },
  modern:     { hp: 440, atk: 26, atkType: 'melee',  range: 9, cooldown: 50, splash: 1.0 },
  future:     { hp: 500, atk: 18, atkType: 'pierce', range: 9, cooldown: 20 },
};
export const WALL_HP = { tool: 120, bronze: 200, iron: 300, medieval: 400, sail: 450, industrial: 500, modern: 650, future: 800 };

// Stats row for a defence type ('tower' | 'wall') in an era. A wall row is just { hp }.
export const defenceStats = (type, age) => {
  if (type === 'tower') return TOWER[age] ?? TOWER.tool;
  if (type === 'wall') return { hp: WALL_HP[age] ?? WALL_HP.tool };
  throw new Error('not a defence: ' + type);
};
