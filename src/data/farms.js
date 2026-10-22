// Farm capacity and work speed by era (invented, game-tuned: see src/data/README.md "Invented content (Farm eras)").
// A Farm takes its numbers from its owner's current era, like a Tower: addBuilding sets `amount` and `maxAmount`, and
// refreshFarms (src/sim/game.js) re-scales every existing one when the owner advances. `rate` multiplies the food gather
// rate of a villager working the Farm, read from the owner's era at gather time; berries and Mines are not affected.
export const FARM = {
  stone:      { amount: 400,  rate: 1 },
  tool:       { amount: 500,  rate: 1.1 },
  bronze:     { amount: 600,  rate: 1.2 },
  iron:       { amount: 750,  rate: 1.3 },
  medieval:   { amount: 900,  rate: 1.4 },
  sail:       { amount: 1050, rate: 1.55 },
  industrial: { amount: 1250, rate: 1.75 },
  modern:     { amount: 1500, rate: 2 },
  future:     { amount: 1800, rate: 2.4 },
};

export const farmStats = age => FARM[age] ?? FARM.stone;
