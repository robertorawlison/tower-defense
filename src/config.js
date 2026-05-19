export const CFG = {
  GRID_COLS: 36,
  GRID_ROWS: 21,
  CELL: 48,

  CASTLE_HP: 100,
  START_COINS: 100,

  CASTLE_COLS: 4,
  CASTLE_ROWS: 3,

  SLOT_DENSITY: 0.6,
  DECOR_DENSITY: 0.18,

  TOWERS: {
    archer: {
      name: 'Torre de Arqueiro',
      sprite: 'archer',
      unlockWave: 0,
      levels: [
        { cost: 50,  damage: 10, range: 3, fireRate: 1.0, projectile: 'arrow' },
        { cost: 80,  damage: 16, range: 3.5, fireRate: 0.8, projectile: 'arrow' },
        { cost: 120, damage: 26, range: 4, fireRate: 0.6, projectile: 'arrow' },
      ],
    },
    crossbow: {
      name: 'Besta',
      sprite: 'crossbow',
      unlockWave: 3,
      levels: [
        { cost: 120, damage: 25, range: 4, fireRate: 1.5, projectile: 'bolt' },
        { cost: 180, damage: 38, range: 4.5, fireRate: 1.2, projectile: 'bolt' },
        { cost: 250, damage: 55, range: 5, fireRate: 1.0, projectile: 'bolt', aoe: 0.6 },
      ],
    },
    catapult: {
      name: 'Catapulta',
      sprite: 'catapult',
      unlockWave: 6,
      levels: [
        { cost: 250, damage: 60, range: 5, fireRate: 2.5, projectile: 'rock', aoe: 1.0 },
        { cost: 350, damage: 90, range: 5.5, fireRate: 2.2, projectile: 'rock', aoe: 1.4 },
        { cost: 500, damage: 130, range: 6, fireRate: 2.0, projectile: 'rock', aoe: 1.8, stun: 0.5 },
      ],
    },
  },

  ENEMIES: {
    martelo: { name: 'Bárbaro com Martelo', hp: 50,  speed: 1.0, damage: 5,  reward: 8,  color: '#c97c4e', label: 'M' },
    furioso: { name: 'Bárbaro Furioso',     hp: 30,  speed: 2.0, damage: 3,  reward: 6,  color: '#e94560', label: 'F' },
    machado: { name: 'Bárbaro com Machado', hp: 200, speed: 0.5, damage: 15, reward: 25, color: '#8b4513', label: 'X' },
  },

  WAVES: [
    { count: 5,  types: ['martelo'], spawnInterval: 1.0 },
    { count: 8,  types: ['martelo'], spawnInterval: 0.9 },
    { count: 12, types: ['martelo'], spawnInterval: 0.8 },
    { count: 12, types: ['martelo', 'furioso'], spawnInterval: 0.8 },
    { count: 15, types: ['martelo', 'furioso'], spawnInterval: 0.7 },
    { count: 18, types: ['martelo', 'furioso'], spawnInterval: 0.6 },
    { count: 18, types: ['martelo', 'furioso', 'machado'], spawnInterval: 0.7 },
    { count: 22, types: ['martelo', 'furioso', 'machado'], spawnInterval: 0.6 },
    { count: 25, types: ['martelo', 'furioso', 'machado'], spawnInterval: 0.5, hpBoost: 1.3 },
    { count: 30, types: ['martelo', 'furioso', 'machado'], spawnInterval: 0.5, hpBoost: 1.6 },
  ],

  COLORS: {
    grass: '#5b8a3a',
    grassAlt: '#4f7b32',
    path: '#9b6b3a',
    pathBorder: '#7a4f23',
    slot: 'rgba(255, 209, 102, 0.35)',
    slotBorder: '#ffd166',
    castle: '#7f8c8d',
    castleRoof: '#2c5d8a',
    castleFlag: '#2c5d8a',
    archer: '#b86c34',
    crossbow: '#8a6c34',
    catapult: '#5a4030',
    arrow: '#f0e0c0',
    bolt: '#cccccc',
    rock: '#555555',
    hpBar: '#2ecc71',
    hpBarBg: '#444',
    rangeIndicator: 'rgba(255, 209, 102, 0.25)',
  },
};

export const DIRS = ['up', 'down', 'left', 'right'];

export function dirFromVector(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
