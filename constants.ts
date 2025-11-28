


import { EnemyType, StarterWeapon, Upgrade, UpgradeType, WeaponType } from "./types";

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;
export const WORLD_WIDTH = 2500; 
export const WORLD_HEIGHT = 2500;
export const LEADERBOARD_KEY = 'cyber_survival_leaderboard_v1';
export const CUSTOM_AVATAR_KEY = 'cyber_survival_avatar_v1';
export const MAX_WEAPONS = 4; // Increased to allow more variety

export const PLAYER_STATS = {
  radius: 16,
  baseSpeed: 5, 
  baseMaxHp: 150, 
  baseFireRate: 150, // ms
  baseBulletSpeed: 12,
  bulletRadius: 5,
  baseDamage: 25,
  color: '#22d3ee', 
  baseMagnetRadius: 80, 
  baseShield: 0,
  baseThorns: 0,
  baseRegen: 0,
  baseShockwaveCooldown: 10,
  baseShockwaveRange: 300,
  baseFreeze: 0,
  baseChainChance: 0,
  baseArea: 1.0,
};

export const XP_BASE = 50; 
export const XP_GROWTH_EXPONENT = 1.15; 
export const OBSTACLE_COUNT = 8; 

// --- STAGE CONFIGURATION (BIOMES - BASED ON KILLS) ---
export const STAGE_CONFIG = [
    { threshold: 0, name: "NEON OUTSKIRTS", hue: 200, densityMult: 1.0, boss: EnemyType.BOSS_GOLIATH }, 
    { threshold: 400, name: "RUST SECTOR", hue: 25, densityMult: 1.4, boss: EnemyType.BOSS_SWARMER }, 
    { threshold: 1000, name: "DEEP CORE", hue: 270, densityMult: 1.8, boss: EnemyType.BOSS_TITAN }, 
    { threshold: 2000, name: "THE VOID", hue: 0, densityMult: 2.5, boss: EnemyType.BOSS_TITAN } 
];

export const STARTER_WEAPONS: StarterWeapon[] = [
  {
    id: 'standard',
    type: WeaponType.RANGED,
    name: '标准突击型',
    description: '均衡的火力配置，适合应对各种情况。',
    color: '#22d3ee', 
    stats: {
      projectileCount: 1,
      damageMultiplier: 1,
      fireRateMultiplier: 1,
    }
  },
  {
    id: 'smart_tracker',
    type: WeaponType.RANGED,
    name: '智能追踪型',
    description: '搭载火控芯片，自动锁定并攻击最近的敌人。',
    color: '#10b981', 
    autoAim: true,
    stats: {
      projectileCount: 1,
      damageMultiplier: 0.75, 
      fireRateMultiplier: 0.9, 
      bulletSpeedMultiplier: 1.2,
      maxHp: 120,
      hp: 120,
    }
  },
  {
    id: 'rocket_heavy',
    type: WeaponType.RANGED,
    name: '重装爆破型',
    description: '发射爆炸导弹，射速较慢但拥有范围伤害。',
    color: '#f97316', 
    stats: {
      projectileCount: 1,
      damageMultiplier: 1.8,
      fireRateMultiplier: 1.5, 
      blastRadius: 60,
      bulletSpeedMultiplier: 0.8,
      maxHp: 250, 
      hp: 250,
    }
  },
  {
    id: 'laser_tech',
    type: WeaponType.RANGED,
    name: '光棱穿透型',
    description: '发射高频激光，可穿透多个敌人，射速极快。',
    color: '#d8b4fe', 
    stats: {
      projectileCount: 1,
      piercing: 3,
      fireRateMultiplier: 0.6, 
      damageMultiplier: 0.5, 
      bulletSpeedMultiplier: 1.5,
      maxHp: 100, 
      hp: 100,
    }
  },
  {
    id: 'plasma_saber',
    type: WeaponType.MELEE,
    name: '等离子光剑',
    description: '高伤害近战。挥砍速度较慢，消除弹幕。',
    color: '#f43f5e', 
    stats: {
      projectileCount: 1,
      damageMultiplier: 2.5,
      fireRateMultiplier: 2.0, 
      areaMultiplier: 1.2, 
      maxHp: 180,
      hp: 180,
      speed: 6, 
    }
  },
  {
    id: 'psi_orbs',
    type: WeaponType.ORBITAL,
    name: '灵能飞环',
    description: '召唤能量球环绕自身。被动造成伤害，适合专注走位。',
    color: '#a78bfa', 
    stats: {
      projectileCount: 2,
      damageMultiplier: 0.8,
      fireRateMultiplier: 0.0, 
      areaMultiplier: 1.2,
      maxHp: 140,
      hp: 140,
    }
  },
  {
    id: 'quantum_blade',
    type: WeaponType.BOOMERANG,
    name: '量子回旋刃',
    description: '投掷出回旋利刃，穿透路径上的敌人并飞回。必须接住才能再次投掷。',
    color: '#fff', 
    stats: {
      projectileCount: 1,
      damageMultiplier: 1.5,
      fireRateMultiplier: 1.2,
      bulletSpeedMultiplier: 1.5,
      piercing: 999, // Infinite pierce for boomerang
      maxHp: 130,
      hp: 130,
    }
  },
  {
    id: 'void_trap',
    type: WeaponType.MINE,
    name: '虚空陷阱',
    description: '放置高伤害隐形地雷。适合阵地战。',
    color: '#52525b', 
    stats: {
      projectileCount: 1,
      damageMultiplier: 4.0, // Very High Damage
      fireRateMultiplier: 1.5, 
      blastRadius: 80,
      bulletSpeedMultiplier: 0, // Stationary
      maxHp: 200,
      hp: 200,
    }
  }
];

export const UPGRADES_POOL: Upgrade[] = [
  {
    id: 'dmg_1',
    type: UpgradeType.DAMAGE,
    name: '高能粒子',
    description: '武器伤害 x1.15 (乘算)',
    rarity: 'COMMON',
  },
  {
    id: 'rate_1',
    type: UpgradeType.FIRE_RATE,
    name: '超频模块',
    description: '攻击速度 +15%',
    rarity: 'COMMON',
  },
  {
    id: 'spd_1',
    type: UpgradeType.SPEED,
    name: '推进器改良',
    description: '移动速度 +10%',
    rarity: 'COMMON',
  },
  {
    id: 'area_1',
    type: UpgradeType.AREA,
    name: '广域透镜',
    description: '攻击范围/爆炸半径 +20%',
    rarity: 'COMMON',
  },
  {
    id: 'hp_1',
    type: UpgradeType.HEALTH,
    name: '纳米装甲修复',
    description: '最大生命值 +50 并回满',
    rarity: 'RARE',
  },
  {
    id: 'shield_1',
    type: UpgradeType.SHIELD,
    name: '能量护盾发生器',
    description: '获得 50 点能量护盾。脱战后自动回复。',
    rarity: 'RARE',
  },
  {
    id: 'magnet_1',
    type: UpgradeType.MAGNET,
    name: '引力透镜',
    description: '物品拾取范围扩大 40%。',
    rarity: 'COMMON',
  },
  {
    id: 'abil_cd_1',
    type: UpgradeType.ABILITY_COOLDOWN,
    name: '战术冷却',
    description: '冲击波冷却时间 -15%',
    rarity: 'RARE',
  },
  {
    id: 'abil_area_1',
    type: UpgradeType.ABILITY_AREA,
    name: '震荡扩容',
    description: '冲击波范围 +25%',
    rarity: 'RARE',
  },
  {
    id: 'multi_1',
    type: UpgradeType.MULTISHOT,
    name: '分裂射击',
    description: '子弹+1，但单发伤害降低15%。', 
    rarity: 'LEGENDARY',
  },
  {
    id: 'thorns_1',
    type: UpgradeType.THORNS,
    name: '反应装甲',
    description: '反伤 +30. 近战敌人会受到伤害。',
    rarity: 'EPIC',
  },
  {
    id: 'regen_1',
    type: UpgradeType.REGEN,
    name: '生化修复液',
    description: '每秒回复 +2 HP',
    rarity: 'EPIC',
  },
  {
    id: 'dmg_2',
    type: UpgradeType.DAMAGE,
    name: '反物质弹头',
    description: '武器伤害 x1.4 (乘算)',
    rarity: 'EPIC',
  },
  {
    id: 'rocket_1',
    type: UpgradeType.ROCKET,
    name: '微型高爆导弹',
    description: '子弹命中时产生爆炸(AOE)',
    rarity: 'LEGENDARY',
  },
  {
    id: 'weapon_drop_1',
    type: UpgradeType.WEAPON_SLOT,
    name: '武器空投',
    description: '获得一把随机新武器。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'freeze_1',
    type: UpgradeType.FREEZE,
    name: '低温凝固',
    description: '攻击会使敌人移动速度降低 40%。',
    rarity: 'RARE',
  },
  {
    id: 'chain_1',
    type: UpgradeType.CHAIN_LIGHTNING,
    name: '雷霆连锁',
    description: '攻击有 30% 概率触发连锁闪电。',
    rarity: 'EPIC',
  },
  // NEW PASSIVE UPGRADES
  {
    id: 'static_field_1',
    type: UpgradeType.STATIC_FIELD,
    name: '静电立场',
    description: '对周围敌人每秒造成伤害 (被动技能)。',
    rarity: 'EPIC',
  },
  {
    id: 'drone_1',
    type: UpgradeType.DRONE_SUPPORT,
    name: '战斗无人机',
    description: '召唤无人机自动攻击最近的敌人。',
    rarity: 'LEGENDARY',
  },
  // EVOLUTIONS
  {
    id: 'evo_shotgun',
    type: UpgradeType.EVO_SHOTGUN,
    name: '进化：暴乱镇压者',
    description: '(标准型) 牺牲射程换取全屏弹幕。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_overload',
    type: UpgradeType.EVO_OVERLOAD,
    name: '进化：超载火炮',
    description: '(标准型) 射速降低，子弹数量和伤害巨幅提升。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_sniper',
    type: UpgradeType.EVO_SNIPER,
    name: '进化：高斯狙击',
    description: '(标准型) 极低射速，即死级单发伤害，无限穿透。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_homing',
    type: UpgradeType.EVO_HOMING,
    name: '进化：响尾蛇追踪',
    description: '(爆破型) 导弹自动追踪敌人。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_incendiary',
    type: UpgradeType.EVO_INCENDIARY,
    name: '进化：地狱火',
    description: '(爆破型) 爆炸半径翻倍，并在地面留下燃烧区域。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_giant_saber',
    type: UpgradeType.EVO_GIANT_SABER,
    name: '进化：泰坦斩击',
    description: '(光剑) 360度旋风斩，范围适度增加。', 
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_nova_orbs',
    type: UpgradeType.EVO_NOVA_ORBS,
    name: '进化：超新星',
    description: '(飞环) 飞环数量翻倍，并周期性向外发射脉冲。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_quantum_storm',
    type: UpgradeType.EVO_QUANTUM_STORM,
    name: '进化：量子风暴',
    description: '(回旋刃) 数量翻倍，无限射程，飞行速度极快。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_gravity_well',
    type: UpgradeType.EVO_GRAVITY_WELL,
    name: '进化：引力奇点',
    description: '(陷阱) 陷阱触发后生成黑洞，牵引并粉碎敌人。',
    rarity: 'LEGENDARY',
  },
  {
    id: 'evo_thunder_god',
    type: UpgradeType.EVO_THUNDER_GOD,
    name: '进化：雷神降临',
    description: '(静电) 范围极大增加，伤害翻倍，频率加快。',
    rarity: 'LEGENDARY',
  },
];

// SPEEDS UPDATED TO PIXELS PER SECOND
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
    baseHp: 40,
    baseSpeed: 140, 
    baseDamage: 5, 
    radius: 12,
    color: '#4ade80', 
    xpValue: 15,
    score: 10,
    minTime: 0,
  },
  [EnemyType.FAST]: {
    baseHp: 20,
    baseSpeed: 280, 
    baseDamage: 3, 
    radius: 8,
    color: '#f87171', 
    xpValue: 25, 
    score: 20,
    minTime: 60, 
  },
  [EnemyType.SPLITTER]: {
    baseHp: 80,
    baseSpeed: 120,
    baseDamage: 10,
    radius: 18,
    color: '#84cc16', // Lime
    xpValue: 40,
    score: 35,
    minTime: 120,
  },
  [EnemyType.CHARGER]: {
    baseHp: 60,
    baseSpeed: 350, 
    baseDamage: 8,
    radius: 10,
    color: '#f97316', 
    xpValue: 35,
    score: 25,
    minTime: 120, 
  },
  [EnemyType.TANK]: {
    baseHp: 200,
    baseSpeed: 60, 
    baseDamage: 10, 
    radius: 28,
    color: '#60a5fa', 
    xpValue: 80, 
    score: 50,
    minTime: 180, 
  },
  [EnemyType.SNIPER]: {
    baseHp: 80,
    baseSpeed: 100,
    baseDamage: 15, // Projectile Dmg
    radius: 14,
    color: '#e879f9', // Fuchsia
    xpValue: 60,
    score: 40,
    minTime: 200, 
  },
  [EnemyType.GHOST]: {
    baseHp: 60,
    baseSpeed: 70, // Slow but persistent
    baseDamage: 12,
    radius: 14,
    color: '#94a3b8', // Slate grey
    xpValue: 50,
    score: 40,
    minTime: 300,
  },
  [EnemyType.EXPLODER]: {
    baseHp: 120,
    baseSpeed: 180,
    baseDamage: 40, 
    radius: 16,
    color: '#e11d48', 
    xpValue: 100,
    score: 60,
    minTime: 300, 
  },
  [EnemyType.ELITE]: {
    baseHp: 600, 
    baseSpeed: 120, 
    baseDamage: 20, 
    radius: 35,
    color: '#c084fc', 
    xpValue: 500,
    score: 150,
    minTime: 300, 
  },
  // BOSS TIERS
  [EnemyType.BOSS_GOLIATH]: {
    baseHp: 8000,
    baseSpeed: 180, 
    baseDamage: 50,
    radius: 70,
    color: '#fbbf24', // Amber
    xpValue: 5000,
    score: 2000,
    minTime: 0, 
  },
  [EnemyType.BOSS_SWARMER]: {
    baseHp: 15000,
    baseSpeed: 250, 
    baseDamage: 40,
    radius: 60,
    color: '#f0abfc', // Pink
    xpValue: 10000,
    score: 5000,
    minTime: 0, 
  },
  [EnemyType.BOSS_TITAN]: {
    baseHp: 50000,
    baseSpeed: 120, 
    baseDamage: 100,
    radius: 100,
    color: '#ef4444', // Red
    xpValue: 25000,
    score: 10000,
    minTime: 0, 
  },
};

export const WAVE_INTERVAL = 800; 

export const LOOT_CONFIG = {
  dropChance: 0.3, 
  healthPackChance: 0.08, 
  xpOrbValue: 25, 
  healthPackValue: 50, 
  duration: 30, 
};
