export const AGES = ['stone', 'tool', 'bronze', 'iron', 'medieval', 'sail', 'industrial', 'modern', 'future'];
export const AGE_NAME = { stone: 'Stone', tool: 'Tool', bronze: 'Bronze', iron: 'Iron', medieval: 'Medieval', sail: 'Age of Sail', industrial: 'Industrial', modern: 'Modern', future: 'AI Future' };
// Sentence form used wherever the UI says "<era> Age"; the sail era reads "Age of Sail", never "Sail Age".
export const AGE_TITLE = { stone: 'Stone Age', tool: 'Tool Age', bronze: 'Bronze Age', iron: 'Iron Age', medieval: 'Medieval Age', sail: 'Age of Sail', industrial: 'Industrial Age', modern: 'Modern Age', future: 'AI Future Age' };
// Cost to advance INTO the age; seconds of research.
export const AGE_COST = {
  tool: { cost: { food: 500, wood: 0, gold: 0, stone: 0 }, time: 30 },
  bronze: { cost: { food: 800, wood: 0, gold: 400, stone: 0 }, time: 40 },
  iron: { cost: { food: 1000, wood: 0, gold: 800, stone: 0 }, time: 50 },
  medieval: { cost: { food: 1100, wood: 200, gold: 900, stone: 0 }, time: 50 },
  sail: { cost: { food: 1200, wood: 400, gold: 1000, stone: 100 }, time: 55 },
  industrial: { cost: { food: 1400, wood: 400, gold: 1100, stone: 200 }, time: 60 },
  modern: { cost: { food: 1600, wood: 0, gold: 1300, stone: 300 }, time: 65 },
  future: { cost: { food: 1800, wood: 0, gold: 1500, stone: 400 }, time: 70 },
};
// Population ceiling per age: houses and Town Centers raise the cap up to this (AoE1 stops at 50 in every age).
export const AGE_POP_LIMIT = { stone: 50, tool: 65, bronze: 80, iron: 100, medieval: 120, sail: 140, industrial: 160, modern: 180, future: 200 };
export const popLimit = a => AGE_POP_LIMIT[a] || AGE_POP_LIMIT.stone;
export const ageIndex = a => AGES.indexOf(a);
export const ageLabel = a => AGE_NAME[a] || a;
export const ageTitle = a => AGE_TITLE[a] || a;
