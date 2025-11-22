
export enum GameState {
  DEVICE_SELECT = 'DEVICE_SELECT',
  MENU = 'MENU',
  LEADERBOARD = 'LEADERBOARD',
  CUSTOMIZE = 'CUSTOMIZE',
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
  CHARGER = 'CHARGER', 
  EXPLODER = 'EXPLODER',
  SNIPER = 'SNIPER', // New Ranged Enemy
  ELITE = 'ELITE',
  // Boss Tiers
  BOSS_GOLIATH = 'BOSS_GOLIATH', // Stage 1 Boss (Tanky)
  BOSS_SWARMER = 'BOSS_SWARMER', // Stage 2 Boss (Fast)
  BOSS_TITAN = 'BOSS_TITAN',     // Stage 3+ Boss (Massive)
}

export enum WeaponType {
  RANGED = 'RANGED',
  MELEE = 'MELEE',
  ORBITAL = 'ORBITAL'
}

export enum UpgradeType {
  DAMAGE = 'DAMAGE',         
  FIRE_RATE = 'FIRE_RATE',   
  SPEED = 'SPEED',           
  HEALTH = 'HEALTH',         
  MULTISHOT = 'MULTISHOT',   
  BULLET_SPEED = 'BULLET_SPEED', 
  LASER = 'LASER',           
  ROCKET = 'ROCKET',         
  SHIELD = 'SHIELD',         
  MAGNET = 'MAGNET',         
  THORNS = 'THORNS',         
  REGEN = 'REGEN',
  AREA = 'AREA',
  DURATION = 'DURATION',
  ABILITY_COOLDOWN = 'ABILITY_COOLDOWN',
  ABILITY_AREA = 'ABILITY_AREA',
  WEAPON_SLOT = 'WEAPON_SLOT', 
  FREEZE = 'FREEZE',           
  CHAIN_LIGHTNING = 'CHAIN_LIGHTNING',
  EVO_SHOTGUN = 'EVO_SHOTGUN',       
  EVO_SNIPER = 'EVO_SNIPER',         
  EVO_HOMING = 'EVO_HOMING',         
  EVO_INCENDIARY = 'EVO_INCENDIARY', 
  EVO_GIANT_SABER = 'EVO_GIANT_SABER', 
  EVO_NOVA_ORBS = 'EVO_NOVA_ORBS',     
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
  type: WeaponType;
  name: string;
  description: string;
  color: string;
  autoAim?: boolean;
  stats: Partial<Player>; 
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

export interface Obstacle extends Entity {
  width: number;
  height: number;
  type: 'WALL' | 'RUIN';
}

export interface Player extends Entity {
  speed: number;
  hp: number;
  maxHp: number;
  angle: number;
  inventory: string[]; 
  activeWeaponIndex: number;
  customAvatar?: string;
  damageMultiplier: number;
  fireRateMultiplier: number;
  bulletSpeedMultiplier: number;
  projectileCount: number;
  areaMultiplier: number; 
  piercing: number;      
  blastRadius: number;   
  autoAim: boolean;
  freezeEffect: number; 
  chainLightningChance: number; 
  isShotgun?: boolean;
  isSniper?: boolean;
  isHoming?: boolean;
  isIncendiary?: boolean;
  isGiantSaber?: boolean;
  isNovaOrbs?: boolean;
  shield: number;
  maxShield: number;
  shieldRegenDelay: number; 
  shieldRegenTimer: number; 
  magnetRadius: number;
  thornsDamage: number;
  hpRegen: number; 
  shockwaveCooldown: number;
  shockwaveTimer: number;
  shockwaveRange: number;
  invulnTimer: number; 
  xp: number;
  maxXp: number;
  level: number;
  upgrades: Record<string, number>; 
}

export interface PlayerAttributes {
  weaponName: string;
  inventory: string[]; 
  activeWeaponIndex: number;
  damage: number;
  fireRate: number; 
  speed: number;
  maxHp: number;
  projectileCount: number;
  piercing: number;
  blastRadius: number;
  bulletSpeed: number;
  upgrades: Record<string, number>;
  shield: number;
  magnet: number;
  thorns: number;
  regen: number;
  area: number;
  isShotgun?: boolean;
  isSniper?: boolean;
  isHoming?: boolean;
  isIncendiary?: boolean;
  isGiantSaber?: boolean;
  isNovaOrbs?: boolean;
}

export interface Enemy extends Entity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  value: number; 
  frozenTimer?: number; 
  burnTimer?: number; 
  pushback: Vector2; 
  // Sniper props
  attackTimer?: number;
}

export interface Projectile extends Entity {
  velocity: Vector2;
  damage: number;
  pierce: number;
  explodeRadius: number;
  freeze: number; 
  chain: boolean; 
  homing?: boolean; 
  incendiary?: boolean; 
  hitIds: string[]; 
  isMelee?: boolean; 
  isOrb?: boolean;
  orbitAngle?: number; 
  orbitRadius?: number; 
  duration?: number; 
  maxDuration?: number;
  swingAngle?: number;
}

export interface EnemyProjectile extends Entity {
  velocity: Vector2;
  damage: number;
}

export interface GameStats {
  score: number;
  kills: number;
  timeAlive: number;
  difficulty: number;
  playerLevel: number;
  stageName: string;
}

export interface LeaderboardEntry {
  date: string;
  score: number;
  kills: number;
  timeAlive: number;
  level: number;
  weapon: string;
}

export interface Particle {
  id: string;
  pos: Vector2;
  radius: number;
  color: string;
  velocity: Vector2;
  life: number;
  maxLife: number;
  alpha: number;
}

export enum LootType {
  XP_ORB = 'XP_ORB',
  HEALTH_PACK = 'HEALTH_PACK',
}

export interface Loot {
  id: string;
  pos: Vector2;
  type: LootType;
  radius: number;
  color: string;
  value: number;
  life: number;
  floatOffset: number;
}

export interface FloatingText {
  id: string;
  pos: Vector2;
  text: string;
  color: string;
  life: number;
  velocity: Vector2;
  size: number;
}
