
export enum GameState {
  DEVICE_SELECT = 'DEVICE_SELECT', // New: Platform selection
  MENU = 'MENU',
  WEAPON_SELECT = 'WEAPON_SELECT',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER',
}

export enum InputMode {
  MOUSE_KB = 'MOUSE_KB',
  TOUCH = 'TOUCH',
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  TANK = 'TANK',
  ELITE = 'ELITE',
}

export enum UpgradeType {
  DAMAGE = 'DAMAGE',         // 伤害提升
  FIRE_RATE = 'FIRE_RATE',   // 射速提升
  SPEED = 'SPEED',           // 移速提升
  HEALTH = 'HEALTH',         // 生命上限 + 回血
  MULTISHOT = 'MULTISHOT',   // 多重射击
  BULLET_SPEED = 'BULLET_SPEED', // 弹道速度
  LASER = 'LASER',           // 激光 (穿透)
  ROCKET = 'ROCKET',         // 火箭 (爆炸 AOE)
  SHIELD = 'SHIELD',         // 能量护盾 (自动回复)
  MAGNET = 'MAGNET',         // 拾取范围
  THORNS = 'THORNS',         // 反伤
  REGEN = 'REGEN',           // 生命再生
}

export interface Upgrade {
  id: string;
  type: UpgradeType;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

export interface StarterWeapon {
  id: string;
  name: string;
  description: string;
  color: string;
  autoAim?: boolean; // New: Does it aim automatically?
  stats: Partial<Player>; // Initial stats override
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  radius: number;
  color: string;
}

export interface Player extends Entity {
  speed: number;
  hp: number;
  maxHp: number;
  angle: number;
  weaponId: string; // Track current weapon
  // Upgradeable Stats
  damageMultiplier: number;
  fireRateMultiplier: number;
  bulletSpeedMultiplier: number;
  projectileCount: number;
  // New Weapon Stats
  piercing: number;      // How many enemies a bullet can pass through
  blastRadius: number;   // Area of effect size (0 = no explosion)
  autoAim: boolean;
  // New Survival Stats
  shield: number;
  maxShield: number;
  shieldRegenDelay: number; // Time in seconds before regen starts
  shieldRegenTimer: number; // Current countdown
  magnetRadius: number;
  thornsDamage: number;
  hpRegen: number; // HP per second
  
  // Ability: EMP Shockwave
  shockwaveCooldown: number;
  shockwaveTimer: number;

  // Leveling
  xp: number;
  maxXp: number;
  level: number;
  // Stats Tracking for UI
  upgrades: Record<string, number>; // count of upgrades by type
}

// New: For passing detailed stats to the Pause Menu
export interface PlayerAttributes {
  weaponName: string;
  damage: number;
  fireRate: number; // shots per second
  speed: number;
  maxHp: number;
  projectileCount: number;
  piercing: number;
  blastRadius: number;
  bulletSpeed: number;
  upgrades: Record<string, number>;
  // New UI Stats
  shield: number;
  magnet: number;
  thorns: number;
  regen: number;
}

export interface Enemy extends Entity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  value: number; // XP/Score value
}

export interface Projectile extends Entity {
  velocity: Vector2;
  damage: number;
  // Weapon properties
  pierce: number;
  explodeRadius: number;
  hitIds: string[]; // Track enemies hit to avoid double-hits with piercing
}

export interface Particle extends Entity {
  velocity: Vector2;
  life: number;
  maxLife: number;
  alpha: number;
}

// New: Loot System
export enum LootType {
  XP_ORB = 'XP_ORB',
  HEALTH_PACK = 'HEALTH_PACK',
}

export interface Loot extends Entity {
  type: LootType;
  value: number;
  life: number; // Despawn timer
  floatOffset: number; // For animation
}

// New: Floating Damage Numbers
export interface FloatingText {
  id: string;
  pos: Vector2;
  text: string;
  color: string;
  life: number;
  velocity: Vector2;
  size: number;
}

export interface GameStats {
  score: number;
  kills: number;
  timeAlive: number; // in seconds
  difficulty: number;
  playerLevel: number;
}

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
}
