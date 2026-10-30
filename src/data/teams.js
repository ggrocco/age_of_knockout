// Shared by the DOM-free simulation, HUD and model palettes. Keep the original two colours stable.
export const TEAMS = [
  { name: 'Blue', color: 0x356bb0, dark: 0x234779 },
  { name: 'Red', color: 0xb84532, dark: 0x7c3027 },
  { name: 'Green', color: 0x38a66b, dark: 0x216443 },
  { name: 'Yellow', color: 0xe3ba37, dark: 0x96771e },
];
export const teamHex = pid => '#' + TEAMS[pid].color.toString(16).padStart(6, '0');
