
import { EnemyType, StarterWeapon, Upgrade, UpgradeType } from "./types";

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

export const PLAYER_STATS = {
  radius: 15,
  baseSpeed: 4,
  baseMaxHp: 100,
  baseFireRate: 150, // ms
  baseBulletSpeed: 12,
  bulletRadius: 4,
  baseDamage: 25,
  color: '#22d3ee', // Cyan-400
  // New Base Stats
  baseMagnetRadius: 60,
  baseShield: 0,
  baseThorns: 0,
  baseRegen: 0,
  baseShockwaveCooldown: 10, // Seconds
};

// Experience Curve: Base * (Level ^ 1.5)
export const XP_BASE = 100;
export const XP_GROWTH_EXPONENT = 1.5;

export const STARTER_WEAPONS: StarterWeapon[] = [
  {
    id: 'standard',
    name: '标准突击型',
    description: '均衡的火力配置，适合应对各种情况。',
    color: '#22d3ee', // Cyan
    stats: {
      projectileCount: 1,
      damageMultiplier: 1,
      fireRateMultiplier: 1,
    }
  },
  {
    id: 'rocket_heavy',
    name: '重装爆破型',
    description: '发射爆炸导弹，射速较慢但拥有范围伤害。',
    color: '#f97316', // Orange
    stats: {
      projectileCount: 1,
      damageMultiplier: 1.5,
      fireRateMultiplier: 1.5, // slower
      blastRadius: 45,
      bulletSpeedMultiplier: 0.8,
      maxHp: 150, 
      hp: 150,
    }
  },
  {
    id: 'laser_tech',
    name: '光棱穿透型',
    description: '发射高频激光，可穿透多个敌人，射速极快。',
    color: '#d8b4fe', // Purple
    stats: {
      projectileCount: 1,
      piercing: 2,
      fireRateMultiplier: 0.6, // fast
      damageMultiplier: 0.4, 
      bulletSpeedMultiplier: 1.5,
      maxHp: 80, 
      hp: 80,
    }
  },
  {
    id: 'omni_drone',
    name: '全向浮游炮',
    description: 'AI自动锁定最近的敌人。伤害较低，但让你专注于走位。',
    color: '#4ade80', // Green
    autoAim: true,
    stats: {
      projectileCount: 1,
      damageMultiplier: 0.7,
      fireRateMultiplier: 0.5, // Very fast
      bulletSpeedMultiplier: 1.1,
      maxHp: 100,
      hp: 100,
    }
  }
];

export const UPGRADES_POOL: Upgrade[] = [
  {
    id: 'dmg_1',
    type: UpgradeType.DAMAGE,
    name: '高能粒子',
    description: '武器伤害提升 20%',
    rarity: 'COMMON',
  },
  {
    id: 'rate_1',
    type: UpgradeType.FIRE_RATE,
    name: '超频模块',
    description: '攻击速度提升 15%',
    rarity: 'COMMON',
  },
  {
    id: 'spd_1',
    type: UpgradeType.SPEED,
    name: '推进器改良',
    description: '移动速度提升 10%',
    rarity: 'COMMON',
  },
  {
    id: 'hp_1',
    type: UpgradeType.HEALTH,
    name: '纳米装甲修复',
    description: '最大生命值 +30 并立即恢复 30% 生命',
    rarity: 'RARE',
  },
  {
    id: 'shield_1',
    type: UpgradeType.SHIELD,
    name: '能量护盾发生器',
    description: '获得 25 点能量护盾。脱战后自动回复。',
    rarity: 'RARE',
  },
  {
    id: 'magnet_1',
    type: UpgradeType.MAGNET,
    name: '引力透镜',
    description: '物品拾取范围扩大 50%。',
    rarity: 'COMMON',
  },
  {
    id: 'multi_1',
    type: UpgradeType.MULTISHOT,
    name: '分裂射击',
    description: '增加 1 发额外子弹，略微降低单发伤害',
    rarity: 'LEGENDARY',
  },
  {
    id: 'velo_1',
    type: UpgradeType.BULLET_SPEED,
    name: '电磁加速',
    description: '子弹飞行速度提升 25%，射程更远',
    rarity: 'COMMON',
  },
  {
    id: 'thorns_1',
    type: UpgradeType.THORNS,
    name: '反应装甲',
    description: '对触碰你的敌人造成 15 点反伤。',
    rarity: 'EPIC',
  },
  {
    id: 'regen_1',
    type: UpgradeType.REGEN,
    name: '生化修复液',
    description: '每秒自动回复 1 点生命值。',
    rarity: 'EPIC',
  },
  {
    id: 'dmg_2',
    type: UpgradeType.DAMAGE,
    name: '反物质弹头',
    description: '武器伤害大幅提升 40%',
    rarity: 'EPIC',
  },
  {
    id: 'laser_1',
    type: UpgradeType.LASER,
    name: '聚焦激光透镜',
    description: '子弹获得穿透效果(+2)，弹道速度大幅提升',
    rarity: 'EPIC',
  },
  {
    id: 'rocket_1',
    type: UpgradeType.ROCKET,
    name: '微型高爆导弹',
    description: '子弹命中时产生爆炸(AOE)，大幅提升单发伤害',
    rarity: 'LEGENDARY',
  },
];

export const ENEMY_CONFIG: Record<EnemyType, {
  baseHp: number;
  baseSpeed: number;
  baseDamage: number;
  radius: number;
  color: string;
  xpValue: number; 
  score: number;
  minTime: number; 
}> = {
  [EnemyType.BASIC]: {
    baseHp: 30,
    baseSpeed: 2,
    baseDamage: 6, 
    radius: 12,
    color: '#4ade80', // Green-400
    xpValue: 10,
    score: 10,
    minTime: 0,
  },
  [EnemyType.FAST]: {
    baseHp: 15,
    baseSpeed: 4.5,
    baseDamage: 2, // Nerfed from 3
    radius: 8,
    color: '#f87171', // Red-400
    xpValue: 15,
    score: 20,
    minTime: 30,
  },
  [EnemyType.TANK]: {
    baseHp: 120,
    baseSpeed: 1,
    baseDamage: 12, // Nerfed from 20
    radius: 25,
    color: '#60a5fa', // Blue-400
    xpValue: 40,
    score: 50,
    minTime: 60,
  },
  [EnemyType.ELITE]: {
    baseHp: 400, // Slightly nerfed HP from 500
    baseSpeed: 3,
    baseDamage: 15, // Significantly nerfed from 35
    radius: 30,
    color: '#c084fc', // Purple-400
    xpValue: 300,
    score: 150,
    minTime: 120,
  },
};

export const WAVE_INTERVAL = 1000; 

export const LOOT_CONFIG = {
  dropChance: 0.15, // 15% chance to drop loot on kill
  healthPackChance: 0.1, // Of that loot, 10% chance to be health
  xpOrbValue: 25, // Bonus XP
  healthPackValue: 30, // Healing amount
  duration: 15, // Seconds loot stays on ground
};
