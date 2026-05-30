export const SCREEN_W = 390;
export const SCREEN_H = 844;

export const TILE_SIZE = 16;

// UI layout zones
export const TOP_BAR_H = 80;
export const BOTTOM_BAR_H = 220;
export const CONTENT_Y = TOP_BAR_H;
export const CONTENT_H = SCREEN_H - TOP_BAR_H - BOTTOM_BAR_H;

// Skill buttons
export const SKILL_BUTTON_SIZE = 88;
export const SKILL_BUTTON_GAP = 10;

// Combat timing
export const BASE_ATTACK_INTERVAL = 2000; // ms
export const STATUS_TICK_INTERVAL = 1000; // ms

// Progression scaling
export const ENEMY_STAT_SCALE_PER_FLOOR = 0.15;
export const ROOM_COUNT_BASE = 5;
export const ROOM_COUNT_PER_FLOORS = 3;
export const ROOM_COUNT_MAX = 20;
export const ENEMIES_PER_ROOM_BASE = 1;
export const ENEMIES_PER_ROOM_SCALE = 5;
export const ENEMIES_PER_ROOM_MAX = 5;
export const ELITE_CHANCE_PER_FLOOR = 0.02;
export const ELITE_CHANCE_MAX = 0.30;

// Meta
export const SAVE_KEY = 'mobilerpg_save';

// Colors
export const COLOR_HP_HIGH = 0x44cc44;
export const COLOR_HP_MED  = 0xddcc00;
export const COLOR_HP_LOW  = 0xcc2222;
export const COLOR_MANA    = 0x4488ff;
export const COLOR_XP      = 0xaa44ff;
export const COLOR_SOUL    = 0x88ccff;
export const COLOR_GOLD    = 0xffcc00;

export const COLOR_COMMON   = 0xaaaaaa;
export const COLOR_UNCOMMON = 0x44ff88;
export const COLOR_RARE     = 0xaa44ff;

// Biome floor ranges
export const BIOME_CYCLE_LENGTH = 5;
