// Building look per era: wall / roof / trim palette, roof form and one signature detail. Pure data; models.js builds the
// geometry and caches it per style key, so eras that share a key (Stone/Tool, Bronze/Iron) share geometry.
const TIMBER = { key: 'timber', wall: 0xbda77f, roof: 0xc9a24a, trim: 0x4e3320, roofForm: 'gable', detail: null };
const MASONRY = { key: 'masonry', wall: 0xd7c7a4, roof: 0xa96342, trim: 0xa99a7f, roofForm: 'gable', detail: null };
export const ERA_STYLE = {
  stone: TIMBER, tool: TIMBER, bronze: MASONRY, iron: MASONRY,
  medieval: { key: 'castle', wall: 0x9c9a92, roof: 0x4f5a66, trim: 0x6f6f68, roofForm: 'gable', detail: 'crenel' },
  sail: { key: 'colonial', wall: 0xeee8dc, roof: 0xb0442e, trim: 0x4e3320, roofForm: 'gable', detail: 'bands' },
  industrial: { key: 'brick', wall: 0x9a4a35, roof: 0x5d6468, trim: 0x6b3426, roofForm: 'gable', detail: 'chimney' },
  modern: { key: 'concrete', wall: 0xc4c2bc, roof: 0x8d8f91, trim: 0x6fa8c8, roofForm: 'flat', detail: 'window' },
  future: { key: 'glass', wall: 0xe4ecef, roof: 0xb8c4c8, trim: 0x8ddbe7, roofForm: 'flat', detail: 'glow' },
};
export const styleOf = age => ERA_STYLE[age] ?? ERA_STYLE.stone;
