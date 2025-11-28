
import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GameState, Player, Enemy, Projectile, Particle, GameStats, EnemyType, Vector2, Upgrade, UpgradeType, Loot, LootType, FloatingText, PlayerAttributes, InputMode, WeaponType, Obstacle, EnemyProjectile } from '../types';
import { PLAYER_STATS, ENEMY_CONFIG, WAVE_INTERVAL, XP_BASE, XP_GROWTH_EXPONENT, STARTER_WEAPONS, LOOT_CONFIG, MAX_WEAPONS, WORLD_WIDTH, WORLD_HEIGHT, OBSTACLE_COUNT, STAGE_CONFIG } from '../constants';
import { audioParams } from '../utils/audio';

interface GameCanvasProps {
  gameState: GameState;
  inputMode: InputMode;
  setGameState: (state: GameState) => void;
  setStats: (stats: React.SetStateAction<GameStats>) => void;
  setPlayerHp: (hp: number) => void;
  setPlayerMaxHp: (hp: number) => void;
  setPlayerXp: (xp: number) => void;
  setMaxXp: (xp: number) => void;
  setPlayerAttributes: (attrs: PlayerAttributes) => void;
  setAbilityCooldown: (cd: {current: number, max: number}) => void;
  onLevelUp: () => void;
  volume: number;
  customAvatar: string | null;
}

export interface GameCanvasHandle {
  applyUpgrade: (upgrade: Upgrade) => void;
  startGame: (weaponId: string) => void;
  triggerAbility: () => void;
  switchWeapon: () => void;
}

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const checkCircleRectCollision = (circlePos: Vector2, radius: number, rectPos: Vector2, width: number, height: number) => {
    const testX = Math.max(rectPos.x, Math.min(circlePos.x, rectPos.x + width));
    const testY = Math.max(rectPos.y, Math.min(circlePos.y, rectPos.y + height));
    const distX = circlePos.x - testX;
    const distY = circlePos.y - testY;
    return (distX * distX + distY * distY) <= (radius * radius);
};

const MAX_ENEMIES_BASE = 300; 

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({
  gameState,
  inputMode,
  setGameState,
  setStats,
  setPlayerHp,
  setPlayerMaxHp,
  setPlayerXp,
  setMaxXp,
  setPlayerAttributes,
  setAbilityCooldown,
  onLevelUp,
  volume,
  customAvatar
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const lootTimerRef = useRef<number>(0);
  const regenTimerRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const nextBossTimeRef = useRef<number>(60); 
  
  const cameraRef = useRef<Vector2>({ x: 0, y: 0 });
  const avatarImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
      if (customAvatar) {
          const img = new Image();
          img.src = customAvatar;
          img.onload = () => { avatarImageRef.current = img; };
      } else { avatarImageRef.current = null; }
  }, [customAvatar]);

  // Entities
  const playerRef = useRef<Player>({
    id: 'player',
    pos: { x: WORLD_WIDTH/2, y: WORLD_HEIGHT/2 },
    radius: PLAYER_STATS.radius,
    color: PLAYER_STATS.color,
    speed: PLAYER_STATS.baseSpeed,
    hp: PLAYER_STATS.baseMaxHp,
    maxHp: PLAYER_STATS.baseMaxHp,
    angle: 0,
    inventory: ['standard'],
    activeWeaponIndex: 0,
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    bulletSpeedMultiplier: 1,
    projectileCount: 1,
    areaMultiplier: 1,
    piercing: 0,
    blastRadius: 0,
    autoAim: false, 
    freezeEffect: 0,
    chainLightningChance: 0,
    shield: 0,
    maxShield: 0,
    shieldRegenDelay: 3,
    shieldRegenTimer: 0,
    magnetRadius: PLAYER_STATS.baseMagnetRadius,
    thornsDamage: 0,
    hpRegen: 0,
    shockwaveCooldown: PLAYER_STATS.baseShockwaveCooldown,
    shockwaveTimer: 0,
    shockwaveRange: PLAYER_STATS.baseShockwaveRange,
    invulnTimer: 0,
    xp: 0,
    maxXp: XP_BASE,
    level: 1,
    upgrades: {},
    // Passives
    staticFieldRange: 0,
    staticFieldDmg: 0,
    staticFieldTimer: 0,
    droneCount: 0,
    droneFireTimer: 0,
    droneFireRate: 1.5,
    droneDmg: 10
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Projectile[]>([]);
  const enemyBulletsRef = useRef<EnemyProjectile[]>([]); 
  const particlesRef = useRef<Particle[]>([]);
  const lootRef = useRef<Loot[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<Vector2>({ x: 0, y: 0 });
  const mouseDownRef = useRef<boolean>(false);
  const lastFireTimeRef = useRef<number>(0);
  const canSwitchRef = useRef<boolean>(true);

  const joystickRef = useRef<{
      active: boolean;
      touchId: number | null;
      origin: Vector2; 
      current: Vector2; 
      vector: Vector2; 
  }>({ active: false, touchId: null, origin: {x:0,y:0}, current: {x:0,y:0}, vector: {x:0,y:0} });

  const gameTimeRef = useRef<number>(0);
  const killsRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const difficultyRef = useRef<number>(1);
  const currentStageIndexRef = useRef<number>(0);

  useEffect(() => { audioParams.setVolume(volume); }, [volume]);

  const generateObstacles = useCallback(() => {
      const obstacles: Obstacle[] = [];
      let attempts = 0;
      while(obstacles.length < OBSTACLE_COUNT && attempts < 100) {
          attempts++;
          const w = randomRange(150, 400);
          const h = randomRange(150, 400);
          const x = randomRange(50, WORLD_WIDTH - w - 50);
          const y = randomRange(50, WORLD_HEIGHT - h - 50);
          
          if (checkCircleRectCollision({x: WORLD_WIDTH/2, y: WORLD_HEIGHT/2}, 400, {x,y}, w, h)) continue;

          let overlap = false;
          for(const obs of obstacles) {
              if (x < obs.pos.x + obs.width + 50 && x + w + 50 > obs.pos.x &&
                  y < obs.pos.y + obs.height + 50 && y + h + 50 > obs.pos.y) {
                  overlap = true; break;
              }
          }
          if (overlap) continue;

          obstacles.push({
              id: `obs_${obstacles.length}`,
              pos: {x, y},
              radius: 0, 
              width: w,
              height: h,
              color: '#1e293b', 
              type: Math.random() > 0.5 ? 'WALL' : 'RUIN'
          });
      }
      obstaclesRef.current = obstacles;
  }, []);

  const recalculateStats = useCallback(() => {
      const p = playerRef.current;
      const weaponId = p.inventory[p.activeWeaponIndex];
      const weaponConfig = STARTER_WEAPONS.find(w => w.id === weaponId) || STARTER_WEAPONS[0];
      
      p.damageMultiplier = 1;
      p.fireRateMultiplier = 1;
      p.bulletSpeedMultiplier = 1;
      p.projectileCount = 1;
      p.areaMultiplier = 1;
      p.piercing = 0;
      p.blastRadius = 0;
      p.freezeEffect = PLAYER_STATS.baseFreeze;
      p.chainLightningChance = PLAYER_STATS.baseChainChance;
      p.autoAim = false;
      p.speed = PLAYER_STATS.baseSpeed;
      p.magnetRadius = PLAYER_STATS.baseMagnetRadius;
      p.maxShield = PLAYER_STATS.baseShield; 
      p.thornsDamage = PLAYER_STATS.baseThorns;
      p.hpRegen = PLAYER_STATS.baseRegen;
      p.shockwaveCooldown = PLAYER_STATS.baseShockwaveCooldown;
      p.shockwaveRange = PLAYER_STATS.baseShockwaveRange;
      p.color = weaponConfig.color;
      
      // Passives Defaults
      p.staticFieldRange = 0;
      p.staticFieldDmg = 0;
      p.droneCount = 0;
      p.droneDmg = 15;
      p.droneFireRate = 1.5;

      // Reset Flags
      p.isShotgun = false; p.isSniper = false; p.isHoming = false; p.isIncendiary = false;
      p.isGiantSaber = false; p.isNovaOrbs = false; p.isOverload = false;
      p.isQuantumStorm = false; p.isGravityWell = false;
      p.isThunderGod = false; p.isAssaultDrone = false;

      if (weaponConfig.stats.damageMultiplier) p.damageMultiplier *= weaponConfig.stats.damageMultiplier;
      if (weaponConfig.stats.fireRateMultiplier) p.fireRateMultiplier *= weaponConfig.stats.fireRateMultiplier;
      if (weaponConfig.stats.bulletSpeedMultiplier) p.bulletSpeedMultiplier *= weaponConfig.stats.bulletSpeedMultiplier;
      if (weaponConfig.stats.projectileCount) p.projectileCount = weaponConfig.stats.projectileCount;
      if (weaponConfig.stats.piercing) p.piercing = weaponConfig.stats.piercing;
      if (weaponConfig.stats.blastRadius) p.blastRadius = weaponConfig.stats.blastRadius;
      if (weaponConfig.stats.areaMultiplier) p.areaMultiplier = weaponConfig.stats.areaMultiplier;
      if (weaponConfig.stats.speed) p.speed = weaponConfig.stats.speed;
      if (weaponConfig.autoAim) p.autoAim = true;

      let calculatedMaxHp = weaponConfig.stats.maxHp || PLAYER_STATS.baseMaxHp;

      if (weaponId === 'standard') {
          if (p.upgrades[UpgradeType.EVO_SHOTGUN]) { p.isShotgun = true; p.projectileCount += 5; p.fireRateMultiplier *= 0.8; p.damageMultiplier *= 0.7; }
          if (p.upgrades[UpgradeType.EVO_SNIPER]) { p.isSniper = true; p.fireRateMultiplier *= 3.0; p.damageMultiplier *= 5.0; p.piercing += 99; p.bulletSpeedMultiplier *= 3.0; }
          if (p.upgrades[UpgradeType.EVO_OVERLOAD]) { p.isOverload = true; p.projectileCount += 4; p.fireRateMultiplier *= 2.5; p.damageMultiplier *= 2.0; p.blastRadius = 20; }
      }
      if (weaponId === 'rocket_heavy') {
          if (p.upgrades[UpgradeType.EVO_HOMING]) { p.isHoming = true; }
          if (p.upgrades[UpgradeType.EVO_INCENDIARY]) { p.isIncendiary = true; p.blastRadius *= 1.5; }
      }
      if (weaponId === 'plasma_saber') {
          if (p.upgrades[UpgradeType.EVO_GIANT_SABER]) { p.isGiantSaber = true; p.areaMultiplier *= 1.25; } 
      }
      if (weaponId === 'psi_orbs') {
          if (p.upgrades[UpgradeType.EVO_NOVA_ORBS]) { p.isNovaOrbs = true; p.projectileCount *= 2; }
      }
      if (weaponId === 'quantum_blade') {
          if (p.upgrades[UpgradeType.EVO_QUANTUM_STORM]) { 
              p.isQuantumStorm = true; 
              p.projectileCount += 2; 
              p.fireRateMultiplier *= 0.5; // Faster fire
          }
      }
      if (weaponId === 'void_trap') {
          if (p.upgrades[UpgradeType.EVO_GRAVITY_WELL]) { p.isGravityWell = true; p.blastRadius *= 1.5; }
      }

      // Passive Skills Calculation
      if (p.upgrades[UpgradeType.STATIC_FIELD]) {
          const level = p.upgrades[UpgradeType.STATIC_FIELD];
          p.staticFieldRange = 100 + (level * 25);
          p.staticFieldDmg = 5 + (level * 5);
          if (p.upgrades[UpgradeType.EVO_THUNDER_GOD]) {
              p.isThunderGod = true;
              p.staticFieldRange *= 1.5;
              p.staticFieldDmg *= 3;
          }
      }

      if (p.upgrades[UpgradeType.DRONE_SUPPORT]) {
          p.droneCount = p.upgrades[UpgradeType.DRONE_SUPPORT];
          if (p.upgrades[UpgradeType.EVO_ASSAULT_DRONE]) {
              p.isAssaultDrone = true;
              p.droneCount += 1;
              p.droneFireRate = 0.5; // Very fast
              p.droneDmg = 25;
          }
      }

      if (p.upgrades[UpgradeType.DAMAGE]) p.damageMultiplier *= Math.pow(1.15, p.upgrades[UpgradeType.DAMAGE]);
      if (p.upgrades[UpgradeType.FIRE_RATE]) p.fireRateMultiplier *= Math.pow(0.9, p.upgrades[UpgradeType.FIRE_RATE]);
      if (p.upgrades[UpgradeType.SPEED]) p.speed *= Math.pow(1.05, p.upgrades[UpgradeType.SPEED]);
      if (p.upgrades[UpgradeType.HEALTH]) calculatedMaxHp += (p.upgrades[UpgradeType.HEALTH] * 50);
      if (p.upgrades[UpgradeType.AREA]) p.areaMultiplier *= Math.pow(1.2, p.upgrades[UpgradeType.AREA]);
      
      if (p.upgrades[UpgradeType.MULTISHOT]) {
          const multiStacks = p.upgrades[UpgradeType.MULTISHOT];
          p.projectileCount += multiStacks;
          p.damageMultiplier *= Math.pow(0.85, multiStacks); 
      }
      
      if (p.upgrades[UpgradeType.SHIELD]) {
          p.maxShield += (p.upgrades[UpgradeType.SHIELD] * 50);
          if (p.shield > p.maxShield) p.shield = p.maxShield;
      }
      if (p.upgrades[UpgradeType.MAGNET]) p.magnetRadius *= Math.pow(1.2, p.upgrades[UpgradeType.MAGNET]);
      if (p.upgrades[UpgradeType.THORNS]) p.thornsDamage += (p.upgrades[UpgradeType.THORNS] * 30);
      if (p.upgrades[UpgradeType.REGEN]) p.hpRegen += (p.upgrades[UpgradeType.REGEN] * 2);
      
      if (p.upgrades[UpgradeType.ABILITY_COOLDOWN]) p.shockwaveCooldown *= Math.pow(0.85, p.upgrades[UpgradeType.ABILITY_COOLDOWN]);
      if (p.upgrades[UpgradeType.ABILITY_AREA]) p.shockwaveRange *= Math.pow(1.25, p.upgrades[UpgradeType.ABILITY_AREA]);

      if (p.upgrades[UpgradeType.FREEZE]) p.freezeEffect = 0.4;
      if (p.upgrades[UpgradeType.CHAIN_LIGHTNING]) p.chainLightningChance = 0.3;

      const oldMaxHp = p.maxHp;
      const hpPercent = p.hp / oldMaxHp;
      p.maxHp = Math.floor(calculatedMaxHp);
      p.hp = Math.floor(p.maxHp * hpPercent);

      setPlayerMaxHp(p.maxHp);
      setPlayerHp(p.hp);
  }, []);

  const resetGame = useCallback((startWeaponId: string = 'standard') => {
    generateObstacles();
    playerRef.current = {
      id: 'player',
      pos: { x: WORLD_WIDTH/2, y: WORLD_HEIGHT/2 },
      radius: PLAYER_STATS.radius,
      color: PLAYER_STATS.color,
      speed: PLAYER_STATS.baseSpeed,
      angle: 0,
      inventory: [startWeaponId],
      activeWeaponIndex: 0,
      hp: PLAYER_STATS.baseMaxHp,
      maxHp: PLAYER_STATS.baseMaxHp,
      damageMultiplier: 1,
      fireRateMultiplier: 1,
      bulletSpeedMultiplier: 1,
      projectileCount: 1,
      areaMultiplier: 1,
      piercing: 0,
      blastRadius: 0,
      autoAim: false,
      freezeEffect: 0,
      chainLightningChance: 0,
      shield: PLAYER_STATS.baseShield,
      maxShield: PLAYER_STATS.baseShield,
      shieldRegenDelay: 3,
      shieldRegenTimer: 0,
      magnetRadius: PLAYER_STATS.baseMagnetRadius,
      thornsDamage: PLAYER_STATS.baseThorns,
      hpRegen: PLAYER_STATS.baseRegen,
      shockwaveCooldown: PLAYER_STATS.baseShockwaveCooldown,
      shockwaveTimer: 0,
      shockwaveRange: PLAYER_STATS.baseShockwaveRange,
      invulnTimer: 0,
      xp: 0,
      maxXp: XP_BASE,
      level: 1,
      upgrades: {},
      staticFieldRange: 0,
      staticFieldDmg: 0,
      staticFieldTimer: 0,
      droneCount: 0,
      droneFireTimer: 0,
      droneFireRate: 1.5,
      droneDmg: 15
    };
    
    recalculateStats();
    playerRef.current.hp = playerRef.current.maxHp;

    enemiesRef.current = [];
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    particlesRef.current = [];
    lootRef.current = [];
    floatingTextsRef.current = [];
    gameTimeRef.current = 0;
    killsRef.current = 0;
    scoreRef.current = 0;
    spawnTimerRef.current = 0;
    lootTimerRef.current = 0;
    regenTimerRef.current = 0;
    lastUiUpdateRef.current = 0;
    shakeRef.current = 0;
    difficultyRef.current = 1;
    nextBossTimeRef.current = 60; 
    currentStageIndexRef.current = 0;
    
    setStats({ score: 0, kills: 0, timeAlive: 0, difficulty: 1, playerLevel: 1, stageName: STAGE_CONFIG[0].name });
    setPlayerHp(playerRef.current.hp);
    setPlayerMaxHp(playerRef.current.maxHp);
    setPlayerXp(0);
    setMaxXp(XP_BASE);
    setAbilityCooldown({current: 0, max: PLAYER_STATS.baseShockwaveCooldown});
    
    audioParams.setVolume(volume);
  }, [setStats, setPlayerHp, setPlayerMaxHp, setPlayerXp, setMaxXp, volume, recalculateStats, generateObstacles]);

  const triggerShockwave = useCallback(() => {
      const p = playerRef.current;
      if (p.shockwaveTimer > 0) return;
      p.shockwaveTimer = p.shockwaveCooldown;
      createExplosion(p.pos, '#06b6d4', 40); 
      shakeRef.current = 20;
      audioParams.playExplosion(); 

      const range = p.shockwaveRange;
      const dmg = Math.floor(100 * (p.damageMultiplier));

      particlesRef.current.push({
          id: 'shockwave',
          pos: {...p.pos},
          radius: 1, 
          color: 'rgba(6, 182, 212, 0.5)',
          velocity: {x:0, y:0},
          life: 100, 
          maxLife: 100,
          alpha: 1
      });

      enemiesRef.current.forEach(e => {
          const dist = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
          if (dist < range) {
              const isBoss = [EnemyType.BOSS_GOLIATH, EnemyType.BOSS_SWARMER, EnemyType.BOSS_TITAN].includes(e.type);
              if (isBoss) {
                  e.hp -= dmg * 0.5;
                  spawnFloatingText(e.pos, `${Math.floor(dmg*0.5)}`, '#06b6d4', 24);
              } else {
                  e.hp -= dmg;
                  e.pushback = {
                      x: (e.pos.x - p.pos.x) / dist * 150,
                      y: (e.pos.y - p.pos.y) / dist * 150
                  };
                  spawnFloatingText(e.pos, `${dmg}`, '#06b6d4', 24);
              }
              enemyBulletsRef.current = enemyBulletsRef.current.filter(b => Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y) > range);
          }
      });
  }, []);

  const handleSwitchWeapon = useCallback(() => {
      const p = playerRef.current;
      if (p.inventory.length <= 1) return;
      
      const currentWeaponId = p.inventory[p.activeWeaponIndex];
      if (currentWeaponId === 'psi_orbs') {
          bulletsRef.current = bulletsRef.current.filter(b => !b.isOrb);
      }
      if (currentWeaponId === 'quantum_blade' && !p.isQuantumStorm) {
          bulletsRef.current = bulletsRef.current.filter(b => !b.isBoomerang);
      }

      p.activeWeaponIndex = (p.activeWeaponIndex + 1) % p.inventory.length;
      recalculateStats();
      
      const weaponId = p.inventory[p.activeWeaponIndex];
      const weaponName = STARTER_WEAPONS.find(w => w.id === weaponId)?.name || "Unknown";
      spawnFloatingText(p.pos, `${weaponName}`, '#fff', 18);
      audioParams.playPickupXP(); 
  }, [recalculateStats]);

  useImperativeHandle(ref, () => ({
    startGame: (weaponId: string) => {
      resetGame(weaponId);
      setGameState(GameState.PLAYING);
    },
    triggerAbility: () => { if (gameState === GameState.PLAYING) triggerShockwave(); },
    switchWeapon: () => { if (gameState === GameState.PLAYING) handleSwitchWeapon(); },
    applyUpgrade: (upgrade: Upgrade) => {
      const p = playerRef.current;
      if (upgrade.type === UpgradeType.WEAPON_SLOT) {
          const owned = new Set(p.inventory);
          const available = STARTER_WEAPONS.filter(w => !owned.has(w.id));
          if (available.length > 0) {
              const newWeapon = available[Math.floor(Math.random() * available.length)];
              p.inventory.push(newWeapon.id);
              spawnFloatingText(p.pos, `GET: ${newWeapon.name}`, '#fbbf24', 20);
          } else {
              p.damageMultiplier *= 1.3;
              spawnFloatingText(p.pos, `LIMIT BREAK (DMG UP)`, '#fbbf24', 16);
          }
      } else {
        p.upgrades[upgrade.type] = (p.upgrades[upgrade.type] || 0) + 1;
        if (upgrade.type === UpgradeType.HEALTH) p.hp = p.maxHp;
        if (upgrade.type === UpgradeType.SHIELD) p.shield = p.maxShield;
      }
      recalculateStats();
      audioParams.playLevelUp();
    }
  }));

  const spawnEnemy = (currentTimeSec: number) => {
    let stage = STAGE_CONFIG[0];
    for (let i = STAGE_CONFIG.length - 1; i >= 0; i--) {
        if (killsRef.current >= STAGE_CONFIG[i].threshold) {
            stage = STAGE_CONFIG[i];
            currentStageIndexRef.current = i;
            break;
        }
    }

    if (currentTimeSec >= nextBossTimeRef.current) {
        const cam = cameraRef.current;
        const bossCount = Math.min(5, 1 + Math.floor(killsRef.current / 500));
        const bossType = stage.boss;
        const config = ENEMY_CONFIG[bossType];
        
        const scalingFactor = 1 + (currentTimeSec / 60) * 0.2 + (killsRef.current / 1000) * 0.5;

        for (let i = 0; i < bossCount; i++) {
             const angle = (Math.PI * 2 / bossCount) * i;
             const px = playerRef.current.pos.x + Math.cos(angle) * 400;
             const py = playerRef.current.pos.y + Math.sin(angle) * 400;

            enemiesRef.current.push({
                id: 'BOSS_' + Math.random(),
                pos: {x: Math.min(Math.max(100, px), WORLD_WIDTH-100), y: Math.min(Math.max(100, py), WORLD_HEIGHT-100)},
                type: bossType,
                radius: config.radius,
                color: config.color,
                maxHp: Math.floor(config.baseHp * scalingFactor),
                hp: Math.floor(config.baseHp * scalingFactor),
                damage: Math.floor(config.baseDamage * scalingFactor),
                speed: config.baseSpeed + (scalingFactor * 5),
                value: config.xpValue * scalingFactor,
                pushback: {x:0,y:0},
                attackTimer: 0,
                actionState: 'IDLE'
            });
        }

        spawnFloatingText({x: playerRef.current.pos.x, y: playerRef.current.pos.y - 100}, `⚠️ WARNING: ${bossCount}x ${bossType} ⚠️`, "#ef4444", 30);
        shakeRef.current = 40;
        audioParams.playLevelUp();
        
        nextBossTimeRef.current += 60; 
        return;
    }

    const maxEnemies = MAX_ENEMIES_BASE * stage.densityMult;
    if (enemiesRef.current.length >= maxEnemies) return;

    let difficultyFactor = 1 + (currentTimeSec / 60) + (killsRef.current / 200);
    
    const availableTypes = Object.values(EnemyType).filter(type => 
        currentTimeSec >= ENEMY_CONFIG[type].minTime && !type.startsWith('BOSS')
    );
    
    let selectedType = EnemyType.BASIC;
    const roll = Math.random();
    
    if (availableTypes.includes(EnemyType.GHOST) && roll < 0.05) selectedType = EnemyType.GHOST;
    else if (availableTypes.includes(EnemyType.SNIPER) && roll < 0.10) selectedType = EnemyType.SNIPER;
    else if (availableTypes.includes(EnemyType.SPLITTER) && roll < 0.15) selectedType = EnemyType.SPLITTER;
    else if (availableTypes.includes(EnemyType.EXPLODER) && roll < 0.20) selectedType = EnemyType.EXPLODER;
    else if (availableTypes.includes(EnemyType.ELITE) && roll < 0.25) selectedType = EnemyType.ELITE;
    else if (availableTypes.includes(EnemyType.CHARGER) && roll < 0.35) selectedType = EnemyType.CHARGER;
    else if (availableTypes.includes(EnemyType.TANK) && roll < 0.45) selectedType = EnemyType.TANK;
    else if (availableTypes.includes(EnemyType.FAST) && roll < 0.60) selectedType = EnemyType.FAST;

    const config = ENEMY_CONFIG[selectedType];
    const cam = cameraRef.current;
    const canvasW = canvasRef.current?.width || 1000;
    const canvasH = canvasRef.current?.height || 1000;
    
    let x = 0, y = 0;
    let validPos = false;
    let attempts = 0;
    
    while(!validPos && attempts < 5) {
        attempts++;
        const edge = Math.floor(Math.random() * 4);
        const offset = 100;
        if (edge === 0) { x = randomRange(cam.x, cam.x + canvasW); y = cam.y - offset; } 
        else if (edge === 1) { x = cam.x + canvasW + offset; y = randomRange(cam.y, cam.y + canvasH); } 
        else if (edge === 2) { x = randomRange(cam.x, cam.x + canvasW); y = cam.y + canvasH + offset; } 
        else { x = cam.x - offset; y = randomRange(cam.y, cam.y + canvasH); } 

        x = Math.max(50, Math.min(WORLD_WIDTH - 50, x));
        y = Math.max(50, Math.min(WORLD_HEIGHT - 50, y));
        
        let collides = false;
        if (selectedType !== EnemyType.GHOST) {
            for (const obs of obstaclesRef.current) {
                if (checkCircleRectCollision({x, y}, config.radius + 10, obs.pos, obs.width, obs.height)) {
                    collides = true; break;
                }
            }
        }
        if (!collides) validPos = true;
    }

    if (validPos) {
        enemiesRef.current.push({
          id: Math.random().toString(36).substring(2),
          pos: { x, y },
          type: selectedType,
          radius: config.radius,
          color: config.color,
          maxHp: Math.floor(config.baseHp * difficultyFactor),
          hp: Math.floor(config.baseHp * difficultyFactor),
          damage: Math.floor(config.baseDamage * (1 + currentTimeSec/500)),
          speed: config.baseSpeed,
          value: Math.ceil(config.xpValue * difficultyFactor * 0.5),
          pushback: {x:0, y:0},
          attackTimer: 0
        });
    }
  };

  const spawnLoot = (pos: Vector2, type: LootType) => {
      lootRef.current.push({
          id: Math.random().toString(),
          pos: { ...pos },
          type,
          radius: 8,
          color: type === LootType.XP_ORB ? '#fbbf24' : '#ef4444', 
          value: type === LootType.XP_ORB ? LOOT_CONFIG.xpOrbValue : LOOT_CONFIG.healthPackValue,
          life: LOOT_CONFIG.duration,
          floatOffset: Math.random() * Math.PI * 2
      });
  };

  const spawnFloatingText = (pos: Vector2, text: string, color: string, size: number = 16) => {
      floatingTextsRef.current.push({
          id: Math.random().toString(),
          pos: { x: pos.x, y: pos.y - 10 },
          text,
          color,
          life: 0.8,
          velocity: { x: (Math.random() - 0.5) * 2, y: -3 },
          size
      });
  };

  const createExplosion = (pos: Vector2, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(2, 8);
      particlesRef.current.push({
        id: Math.random().toString(),
        pos: { ...pos },
        radius: randomRange(1, 4),
        color: color,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 1.0,
        maxLife: 1.0,
        alpha: 1,
      });
    }
  };

  const update = useCallback((timestamp: number) => {
    if (gameState !== GameState.PLAYING) {
        if (gameState === GameState.GAME_OVER || gameState === GameState.LEVEL_UP || gameState === GameState.PAUSED) draw();
        requestRef.current = requestAnimationFrame(update);
        return;
    }

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    const safeDelta = Math.min(deltaTime, 50); 
    const dtSec = safeDelta / 1000;

    gameTimeRef.current += safeDelta;
    const timeInSeconds = gameTimeRef.current / 1000;
    difficultyRef.current = 1 + (timeInSeconds / 60) + (killsRef.current / 300);

    if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current * 0.9);

    const p = playerRef.current;
    const w = canvasRef.current?.width || window.innerWidth;
    const h = canvasRef.current?.height || window.innerHeight;

    // --- PLAYER MOVEMENT ---
    if (p.shockwaveTimer > 0) p.shockwaveTimer -= dtSec;
    if (p.shieldRegenTimer > 0) p.shieldRegenTimer -= dtSec;
    else if (p.shield < p.maxShield) p.shield = Math.min(p.maxShield, p.shield + (p.maxShield * 0.2 * dtSec));
    
    if (p.invulnTimer > 0) p.invulnTimer -= dtSec;

    if (p.hpRegen > 0) {
      regenTimerRef.current += dtSec;
      if (regenTimerRef.current >= 1.0) {
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + p.hpRegen);
          spawnFloatingText(p.pos, `+${Math.floor(p.hpRegen)}`, '#4ade80', 10);
        }
        regenTimerRef.current = 0;
      }
    }

    // --- PASSIVE: STATIC FIELD ---
    if (p.staticFieldRange > 0) {
        p.staticFieldTimer += dtSec;
        const tickRate = p.isThunderGod ? 0.3 : 0.8; 
        if (p.staticFieldTimer >= tickRate) {
            let hit = false;
            for (const e of enemiesRef.current) {
                const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
                if (d < p.staticFieldRange) {
                     e.hp -= p.staticFieldDmg * p.damageMultiplier;
                     spawnFloatingText(e.pos, `${Math.floor(p.staticFieldDmg)}`, '#60a5fa', 12);
                     if (p.isThunderGod && Math.random() < 0.2) e.frozenTimer = 0.5;
                     hit = true;
                }
            }
            if (hit) {
                 createExplosion(p.pos, '#60a5fa', 2);
                 if (p.isThunderGod) audioParams.playLaser(); // Small zap sound
            }
            p.staticFieldTimer = 0;
        }
    }

    // --- PASSIVE: DRONE SUPPORT ---
    if (p.droneCount > 0) {
        p.droneFireTimer += dtSec;
        if (p.droneFireTimer >= p.droneFireRate) {
            let fired = 0;
            // Find target
            let target: Enemy | null = null;
            let minD = 500;
            for(const e of enemiesRef.current) {
                const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
                if (d < minD) { minD = d; target = e; }
            }

            if (target) {
                for(let i=0; i<p.droneCount; i++) {
                     const droneAngle = (gameTimeRef.current/500) + (i * (Math.PI*2/p.droneCount));
                     const dx = p.pos.x + Math.cos(droneAngle) * 50;
                     const dy = p.pos.y + Math.sin(droneAngle) * 50;
                     const aimAngle = Math.atan2(target.pos.y - dy, target.pos.x - dx);

                     bulletsRef.current.push({
                        id: 'DRONE_'+Math.random(),
                        pos: {x: dx, y: dy},
                        velocity: { x: Math.cos(aimAngle)*15, y: Math.sin(aimAngle)*15 },
                        radius: 4,
                        color: p.isAssaultDrone ? '#f59e0b' : '#34d399',
                        damage: p.droneDmg * p.damageMultiplier,
                        pierce: p.isAssaultDrone ? 1 : 0,
                        explodeRadius: 0,
                        freeze: 0, chain: false,
                        hitIds: [],
                        isDroneShot: true
                     });
                     fired++;
                }
                if(fired > 0) {
                     audioParams.playShoot(2.0); // Higher pitch for drone
                     p.droneFireTimer = 0;
                }
            }
        }
    }

    let dx = 0, dy = 0;
    if (inputMode === InputMode.TOUCH && joystickRef.current.active) {
        dx = joystickRef.current.vector.x;
        dy = joystickRef.current.vector.y;
    } else {
        if (keysRef.current.has('w') || keysRef.current.has('arrowup')) dy -= 1;
        if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) dy += 1;
        if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) dx -= 1;
        if (keysRef.current.has('d') || keysRef.current.has('arrowright')) dx += 1;
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len; dy /= len;
        }
    }

    const nextX = p.pos.x + dx * p.speed; 
    const nextY = p.pos.y + dy * p.speed;
    
    let canMoveX = nextX > p.radius && nextX < WORLD_WIDTH - p.radius;
    let canMoveY = nextY > p.radius && nextY < WORLD_HEIGHT - p.radius;

    if (canMoveX) {
        for (const obs of obstaclesRef.current) {
            if (checkCircleRectCollision({x: nextX, y: p.pos.y}, p.radius, obs.pos, obs.width, obs.height)) {
                canMoveX = false; break;
            }
        }
    }
    if (canMoveY) {
        for (const obs of obstaclesRef.current) {
            if (checkCircleRectCollision({x: p.pos.x, y: nextY}, p.radius, obs.pos, obs.width, obs.height)) {
                canMoveY = false; break;
            }
        }
    }

    if (canMoveX) p.pos.x = nextX;
    if (canMoveY) p.pos.y = nextY;

    // Camera
    const targetCamX = p.pos.x - w / 2;
    const targetCamY = p.pos.y - h / 2;
    cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
    cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;
    cameraRef.current.x = Math.max(0, Math.min(WORLD_WIDTH - w, cameraRef.current.x));
    cameraRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT - h, cameraRef.current.y));

    // UI Sync
    if (timestamp - lastUiUpdateRef.current > 100) {
      const weaponConfig = STARTER_WEAPONS.find(w => w.id === p.inventory[p.activeWeaponIndex]);
      setStats({
        score: Math.floor(scoreRef.current),
        kills: killsRef.current,
        timeAlive: timeInSeconds,
        difficulty: difficultyRef.current,
        playerLevel: playerRef.current.level,
        stageName: STAGE_CONFIG[currentStageIndexRef.current].name
      });
      setPlayerHp(Math.floor(p.hp));
      setPlayerXp(Math.floor(p.xp));
      setMaxXp(Math.floor(p.maxXp));
      setAbilityCooldown({current: p.shockwaveTimer, max: p.shockwaveCooldown});
      setPlayerAttributes({
          weaponName: weaponConfig?.name || "Unknown",
          inventory: p.inventory,
          activeWeaponIndex: p.activeWeaponIndex,
          damage: Math.floor(PLAYER_STATS.baseDamage * p.damageMultiplier),
          fireRate: parseFloat((1000 / (PLAYER_STATS.baseFireRate * p.fireRateMultiplier)).toFixed(1)),
          speed: parseFloat(p.speed.toFixed(1)),
          maxHp: Math.floor(p.maxHp),
          projectileCount: p.projectileCount,
          piercing: p.piercing,
          blastRadius: Math.floor(p.blastRadius),
          bulletSpeed: Math.floor(PLAYER_STATS.baseBulletSpeed * p.bulletSpeedMultiplier),
          upgrades: p.upgrades,
          shield: Math.floor(p.shield),
          magnet: Math.floor(p.magnetRadius),
          thorns: Math.floor(p.thornsDamage),
          regen: parseFloat(p.hpRegen.toFixed(1)),
          area: parseFloat(p.areaMultiplier.toFixed(1)),
          isShotgun: p.isShotgun,
          isSniper: p.isSniper,
          isOverload: p.isOverload,
          isHoming: p.isHoming,
          isIncendiary: p.isIncendiary,
          isGiantSaber: p.isGiantSaber,
          isNovaOrbs: p.isNovaOrbs,
          isQuantumStorm: p.isQuantumStorm
      });
      lastUiUpdateRef.current = timestamp;
    }

    // Spawning
    spawnTimerRef.current += safeDelta;
    const currentCount = enemiesRef.current.length;
    let spawnInterval = Math.max(50, WAVE_INTERVAL - (difficultyRef.current * 30));
    if (currentCount < 20) spawnInterval /= 2; 
    if (spawnTimerRef.current > spawnInterval) {
      spawnEnemy(timeInSeconds);
      spawnTimerRef.current = 0;
    }

    lootTimerRef.current += safeDelta;
    if (lootTimerRef.current > 15000) {
        const lx = Math.max(0, Math.min(WORLD_WIDTH, p.pos.x + randomRange(-400, 400)));
        const ly = Math.max(0, Math.min(WORLD_HEIGHT, p.pos.y + randomRange(-400, 400)));
        spawnLoot({x: lx, y: ly}, LootType.HEALTH_PACK);
        lootTimerRef.current = 0;
    }

    // --- AIM & FIRE ---
    const activeWeapon = STARTER_WEAPONS.find(w => w.id === p.inventory[p.activeWeaponIndex]) || STARTER_WEAPONS[0];
    const canFire = timestamp - lastFireTimeRef.current > (PLAYER_STATS.baseFireRate * p.fireRateMultiplier);
    
    let aimAngle = p.angle;
    let shouldFire = false;
    let nearestEnemy: Enemy | null = null;
    let minDist = 9999;

    if (inputMode === InputMode.TOUCH || p.autoAim) {
        for (const e of enemiesRef.current) {
            const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
            if (d < minDist && d < 600) { 
                minDist = d;
                nearestEnemy = e;
            }
        }
    }
    
    if (inputMode === InputMode.TOUCH) {
         if (nearestEnemy) {
            aimAngle = Math.atan2(nearestEnemy.pos.y - p.pos.y, nearestEnemy.pos.x - p.pos.x);
            shouldFire = true;
        }
    } else {
        if (p.autoAim && nearestEnemy) {
             aimAngle = Math.atan2(nearestEnemy.pos.y - p.pos.y, nearestEnemy.pos.x - p.pos.x);
             shouldFire = true;
        } else {
             const worldMouseX = mouseRef.current.x + cameraRef.current.x;
             const worldMouseY = mouseRef.current.y + cameraRef.current.y;
             aimAngle = Math.atan2(worldMouseY - p.pos.y, worldMouseX - p.pos.x);
             if (activeWeapon.type === WeaponType.ORBITAL || activeWeapon.type === WeaponType.MELEE || activeWeapon.type === WeaponType.MINE) shouldFire = true; 
             else shouldFire = mouseDownRef.current;
        }
    }
    p.angle = aimAngle;

    if (shouldFire && canFire) {
        // Boomerang Limit Check
        if (activeWeapon.type === WeaponType.BOOMERANG && !p.isQuantumStorm) {
            const activeBoomerangs = bulletsRef.current.filter(b => b.isBoomerang).length;
            if (activeBoomerangs >= p.projectileCount) {
                shouldFire = false; // Cannot fire until returned
            }
        }

        if (shouldFire) {
            if (activeWeapon.type === WeaponType.ORBITAL) {
                const orbCount = bulletsRef.current.filter(b => b.isOrb).length;
                const desired = p.projectileCount;
                if (orbCount < desired) {
                    for (let i = orbCount; i < desired; i++) {
                        bulletsRef.current.push({
                            id: Math.random().toString(),
                            pos: { ...p.pos },
                            radius: 8 * p.areaMultiplier,
                            color: activeWeapon.color,
                            velocity: {x:0,y:0},
                            damage: PLAYER_STATS.baseDamage * p.damageMultiplier,
                            pierce: 999,
                            explodeRadius: p.isNovaOrbs ? 50 : 0,
                            freeze: p.freezeEffect,
                            chain: false,
                            isOrb: true,
                            orbitAngle: (Math.PI * 2 / desired) * i,
                            orbitRadius: 100 * p.areaMultiplier,
                            hitIds: []
                        });
                    }
                }
            } 
            else if (activeWeapon.type === WeaponType.MELEE) {
                audioParams.playLaser();
                bulletsRef.current.push({
                    id: Math.random().toString(),
                    pos: { ...p.pos },
                    radius: 80 * p.areaMultiplier, 
                    color: activeWeapon.color,
                    velocity: {x:0, y:0},
                    damage: PLAYER_STATS.baseDamage * p.damageMultiplier,
                    pierce: 999,
                    explodeRadius: 0,
                    freeze: p.freezeEffect,
                    chain: false,
                    isMelee: true,
                    duration: 0.3,
                    maxDuration: 0.3,
                    swingAngle: aimAngle,
                    hitIds: []
                });
                lastFireTimeRef.current = timestamp;
            }
            else if (activeWeapon.type === WeaponType.MINE) {
                const minesCount = bulletsRef.current.filter(b => b.isMine).length;
                if (minesCount < 10) { 
                    audioParams.playRocket(); 
                    bulletsRef.current.push({
                        id: Math.random().toString(),
                        pos: { ...p.pos },
                        radius: 12,
                        color: activeWeapon.color,
                        velocity: {x:0, y:0},
                        damage: PLAYER_STATS.baseDamage * p.damageMultiplier,
                        pierce: 1, 
                        explodeRadius: activeWeapon.stats.blastRadius || 60,
                        freeze: p.freezeEffect,
                        chain: false,
                        isMine: true,
                        isGravityWell: p.isGravityWell,
                        duration: 30, 
                        hitIds: []
                    });
                    lastFireTimeRef.current = timestamp;
                }
            }
            else if (activeWeapon.type === WeaponType.BOOMERANG) {
                audioParams.playShoot(0.5);
                const count = p.isQuantumStorm ? 1 : 1; 
                
                for(let i=0; i<count; i++) {
                    bulletsRef.current.push({
                        id: Math.random().toString(),
                        pos: { ...p.pos },
                        radius: 12 * p.areaMultiplier,
                        color: p.isQuantumStorm ? '#818cf8' : activeWeapon.color,
                        velocity: {
                            x: Math.cos(aimAngle) * PLAYER_STATS.baseBulletSpeed * p.bulletSpeedMultiplier * (p.isQuantumStorm ? 1.5 : 1),
                            y: Math.sin(aimAngle) * PLAYER_STATS.baseBulletSpeed * p.bulletSpeedMultiplier * (p.isQuantumStorm ? 1.5 : 1)
                        },
                        damage: PLAYER_STATS.baseDamage * p.damageMultiplier,
                        pierce: 999,
                        explodeRadius: 0,
                        freeze: p.freezeEffect,
                        chain: false,
                        isBoomerang: true,
                        returnSpeed: 0,
                        hitIds: []
                    });
                }
                lastFireTimeRef.current = timestamp;
            }
            else {
                if (p.blastRadius > 0) audioParams.playRocket();
                else audioParams.playShoot(1.0 + Math.random()*0.2);
                
                const count = p.projectileCount;
                for (let i = 0; i < count; i++) {
                    let offset = 0;
                    if (count > 1) offset = p.isShotgun ? (Math.random() - 0.5) * 0.8 : (i - (count - 1) / 2) * 0.1;
                    
                    bulletsRef.current.push({
                        id: Math.random().toString(),
                        pos: { ...p.pos },
                        radius: p.blastRadius > 0 ? 8 : 4,
                        color: activeWeapon.color,
                        velocity: {
                            x: Math.cos(aimAngle + offset) * PLAYER_STATS.baseBulletSpeed * p.bulletSpeedMultiplier,
                            y: Math.sin(aimAngle + offset) * PLAYER_STATS.baseBulletSpeed * p.bulletSpeedMultiplier
                        },
                        damage: PLAYER_STATS.baseDamage * p.damageMultiplier,
                        pierce: p.piercing,
                        explodeRadius: p.blastRadius,
                        freeze: p.freezeEffect,
                        chain: p.chainLightningChance > 0 && Math.random() < p.chainLightningChance,
                        homing: p.isHoming,
                        incendiary: p.isIncendiary,
                        hitIds: []
                    });
                }
                lastFireTimeRef.current = timestamp;
            }
        }
    }

    // --- ENTITY UPDATES ---

    // Player Bullets
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        if (b.isOrb) {
            if (!b.orbitAngle) b.orbitAngle = 0;
            b.orbitAngle += 0.05 * p.bulletSpeedMultiplier;
            b.pos.x = p.pos.x + Math.cos(b.orbitAngle) * (b.orbitRadius || 100);
            b.pos.y = p.pos.y + Math.sin(b.orbitAngle) * (b.orbitRadius || 100);
            
            if (p.isNovaOrbs) {
                const isPulse = (gameTimeRef.current % 2000) < 500;
                if (isPulse) b.radius = 20 * p.areaMultiplier; 
                else b.radius = 8 * p.areaMultiplier;
            } else {
                b.radius = 8 * p.areaMultiplier;
            }
        } else if (b.isMelee) {
            b.pos = { ...p.pos };
            if (b.duration) b.duration -= dtSec;
            if (b.duration && b.duration <= 0) {
                bulletsRef.current.splice(i, 1);
                continue;
            }
        } else if (b.isMine) {
            if (b.duration) b.duration -= dtSec;
            if (b.duration && b.duration <= 0) {
                 bulletsRef.current.splice(i, 1);
                 continue;
            }
            if (b.isGravityWell) {
                 // Gravity effect
                 for(const e of enemiesRef.current) {
                     const dx = b.pos.x - e.pos.x;
                     const dy = b.pos.y - e.pos.y;
                     const d = Math.sqrt(dx*dx + dy*dy);
                     if (d < 200) {
                         e.pos.x += dx * 0.05;
                         e.pos.y += dy * 0.05;
                     }
                 }
            }
        } else {
            // Boomerang Logic
            if (b.isBoomerang) {
                 b.returnSpeed = (b.returnSpeed || 0) + (dtSec * 1.0); // Acceleration factor for returning phase
                 
                 // Apply Drag to initial velocity
                 const drag = 2.0;
                 b.velocity.x -= b.velocity.x * dtSec * drag;
                 b.velocity.y -= b.velocity.y * dtSec * drag;

                 // Calculate vector to player
                 const dx = p.pos.x - b.pos.x;
                 const dy = p.pos.y - b.pos.y;
                 const dist = Math.hypot(dx, dy);
                 
                 // Catch logic
                 if (dist < 30 && b.returnSpeed > 1) { 
                     bulletsRef.current.splice(i, 1);
                     continue;
                 }
                 
                 // Homing return logic
                 const speedMult = p.isQuantumStorm ? 30 : 20;
                 // Normalize direction
                 if (dist > 0) {
                     const dirX = dx / dist;
                     const dirY = dy / dist;
                     
                     // Apply return velocity
                     b.velocity.x += dirX * b.returnSpeed * speedMult * dtSec;
                     b.velocity.y += dirY * b.returnSpeed * speedMult * dtSec;
                 }
            }
            else if (b.homing) {
                let target = null, minD = 600;
                for (const e of enemiesRef.current) {
                    const d = Math.hypot(e.pos.x - b.pos.x, e.pos.y - b.pos.y);
                    if (d < minD) { minD = d; target = e; }
                }
                if (target) {
                    const angle = Math.atan2(target.pos.y - b.pos.y, target.pos.x - b.pos.x);
                    const currentSpeed = Math.hypot(b.velocity.x, b.velocity.y);
                    const steerStrength = 0.15; 
                    b.velocity.x = b.velocity.x * (1-steerStrength) + Math.cos(angle) * currentSpeed * steerStrength;
                    b.velocity.y = b.velocity.y * (1-steerStrength) + Math.sin(angle) * currentSpeed * steerStrength;
                    const newSpeed = Math.hypot(b.velocity.x, b.velocity.y);
                    if (newSpeed > 0) {
                        b.velocity.x = (b.velocity.x / newSpeed) * currentSpeed;
                        b.velocity.y = (b.velocity.y / newSpeed) * currentSpeed;
                    }
                }
            }
            b.pos.x += b.velocity.x; 
            b.pos.y += b.velocity.y;

            if (!b.pierce && !b.isBoomerang) { 
                for (const obs of obstaclesRef.current) {
                    if (checkCircleRectCollision(b.pos, b.radius, obs.pos, obs.width, obs.height)) {
                        createExplosion(b.pos, '#94a3b8', 3);
                        bulletsRef.current.splice(i, 1);
                        continue;
                    }
                }
            }
            if (!b.isBoomerang && (b.pos.x < 0 || b.pos.x > WORLD_WIDTH || b.pos.y < 0 || b.pos.y > WORLD_HEIGHT)) {
                bulletsRef.current.splice(i, 1);
                continue;
            }
        }
    }

    // Enemy Bullets (Snipers/Titans)
    for (let i = enemyBulletsRef.current.length - 1; i >= 0; i--) {
        const b = enemyBulletsRef.current[i];
        b.pos.x += b.velocity.x;
        b.pos.y += b.velocity.y;
        
        // Hit Player
        const d = Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y);
        if (d < p.radius + b.radius) {
             if (p.invulnTimer <= 0) {
                const dmg = b.damage;
                if (p.shield > 0) { p.shield = Math.max(0, p.shield - dmg); p.shieldRegenTimer = 5; }
                else { p.hp -= dmg; audioParams.playHit(); shakeRef.current = 5; }
                p.invulnTimer = 0.5;
             }
             enemyBulletsRef.current.splice(i, 1);
             continue;
        }

        if (b.pos.x < 0 || b.pos.x > WORLD_WIDTH || b.pos.y < 0 || b.pos.y > WORLD_HEIGHT) {
            enemyBulletsRef.current.splice(i, 1);
            continue;
        }
    }

    // Loot
    for (let i = lootRef.current.length - 1; i >= 0; i--) {
        const item = lootRef.current[i];
        item.life -= dtSec;
        if (item.life <= 0) { lootRef.current.splice(i, 1); continue; }
        
        const dist = Math.hypot(p.pos.x - item.pos.x, p.pos.y - item.pos.y);
        if (dist < p.magnetRadius) {
             item.pos.x += (p.pos.x - item.pos.x) * 0.1;
             item.pos.y += (p.pos.y - item.pos.y) * 0.1;
             if (dist < p.radius) {
                 if (item.type === LootType.XP_ORB) {
                     p.xp += item.value;
                     if (p.xp >= p.maxXp) {
                         p.xp -= p.maxXp; p.level++;
                         p.maxXp = Math.floor(XP_BASE * Math.pow(p.level, XP_GROWTH_EXPONENT));
                         onLevelUp();
                     }
                     spawnFloatingText(p.pos, `+${item.value}XP`, '#fbbf24', 12);
                 } else {
                     p.hp = Math.min(p.maxHp, p.hp + item.value);
                     spawnFloatingText(p.pos, `+${item.value}HP`, '#22c55e', 14);
                 }
                 audioParams.playPickupHealth();
                 lootRef.current.splice(i, 1);
             }
        }
    }

    // Enemies
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const e = enemiesRef.current[i];
        
        e.pos.x += e.pushback.x * dtSec;
        e.pos.y += e.pushback.y * dtSec;
        e.pushback.x *= 0.9; e.pushback.y *= 0.9;

        let speed = e.speed;
        if (e.frozenTimer && e.frozenTimer > 0) { speed *= 0.6; e.frozenTimer -= dtSec; }
        if (e.burnTimer && e.burnTimer > 0) {
            e.burnTimer -= dtSec;
            if (Math.random() < 0.1) {
                e.hp -= 5;
                spawnFloatingText(e.pos, "5", "#f97316", 10);
                if (e.hp <= 0) { processKill(e); enemiesRef.current.splice(i,1); continue; }
            }
        }

        const angle = Math.atan2(p.pos.y - e.pos.y, p.pos.x - e.pos.x);
        
        // Specialized Movement AI
        let moveX = Math.cos(angle) * speed * dtSec;
        let moveY = Math.sin(angle) * speed * dtSec;
        
        if (e.type === EnemyType.CHARGER) {
            if (gameTimeRef.current % 1500 < 500) { moveX *= 3; moveY *= 3; } 
            else { moveX *= 0.2; moveY *= 0.2; }
        }

        // Sniper Logic
        if (e.type === EnemyType.SNIPER) {
            const distToPlayer = Math.hypot(p.pos.x - e.pos.x, p.pos.y - e.pos.y);
            if (distToPlayer < 400) {
                moveX = 0; moveY = 0; // Stop to shoot
                e.attackTimer = (e.attackTimer || 0) + dtSec;
                if (e.attackTimer > 2.0) {
                    audioParams.playLaser(); 
                    enemyBulletsRef.current.push({
                        id: Math.random().toString(),
                        pos: {...e.pos},
                        velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
                        damage: e.damage,
                        radius: 4,
                        color: '#e879f9'
                    });
                    e.attackTimer = 0;
                }
            } else {
                e.attackTimer = 0;
            }
        }
        
        // Multi-Stage Boss Logic
        if (e.type.startsWith('BOSS')) {
             const hpPct = e.hp / e.maxHp;
             e.isEnraged = hpPct < 0.5;
             e.attackTimer = (e.attackTimer || 0) + dtSec;

             if (e.type === EnemyType.BOSS_GOLIATH) {
                 // Charge attack
                 const chargeInterval = e.isEnraged ? 3 : 5;
                 if (e.actionState === 'CHARGE') {
                      moveX *= 4; moveY *= 4; // Rush
                      if (e.attackTimer > 0.5) { e.actionState = 'IDLE'; e.attackTimer = 0; }
                 } else {
                      if (e.attackTimer > chargeInterval) {
                          e.actionState = 'CHARGE'; e.attackTimer = 0;
                          createExplosion(e.pos, '#fbbf24', 10); // Warning effect
                      }
                 }
             } else if (e.type === EnemyType.BOSS_SWARMER) {
                 // Summon minions
                 const summonInterval = e.isEnraged ? 4 : 8;
                 if (e.attackTimer > summonInterval) {
                     spawnFloatingText(e.pos, "SUMMON!", "#f0abfc", 24);
                     for(let k=0; k<3; k++) {
                         enemiesRef.current.push({
                            id: 'MINION_'+Math.random(),
                            pos: { x: e.pos.x + randomRange(-50,50), y: e.pos.y + randomRange(-50,50) },
                            type: EnemyType.FAST,
                            radius: 8, color: '#f87171',
                            hp: 10, maxHp: 10, damage: 5, speed: 280,
                            value: 5, pushback: {x:0,y:0}
                         });
                     }
                     e.attackTimer = 0;
                 }
                 // Swarmer tries to keep distance
                 const dist = Math.hypot(p.pos.x - e.pos.x, p.pos.y - e.pos.y);
                 if (dist < 300) { moveX *= -0.5; moveY *= -0.5; }
             } else if (e.type === EnemyType.BOSS_TITAN) {
                 // Bullet Hell
                 const fireInterval = e.isEnraged ? 0.5 : 1.5;
                 moveX *= 0.2; moveY *= 0.2; // Slow move
                 if (e.attackTimer > fireInterval) {
                     const bulletCount = 12;
                     for(let k=0; k<bulletCount; k++) {
                         const ba = (Math.PI*2/bulletCount)*k + (gameTimeRef.current/1000);
                         enemyBulletsRef.current.push({
                             id: 'TITAN_SHOT_'+Math.random(),
                             pos: {...e.pos},
                             velocity: { x: Math.cos(ba)*6, y: Math.sin(ba)*6 },
                             damage: 15, radius: 6, color: '#ef4444'
                         });
                     }
                     e.attackTimer = 0;
                 }
             }
        }

        let nextX = e.pos.x + moveX;
        let nextY = e.pos.y + moveY;

        // Collision logic
        const isGhost = e.type === EnemyType.GHOST;
        
        if (!isGhost) {
            const isBoss = e.type.startsWith('BOSS');
            if (isBoss) {
                 for (let k = obstaclesRef.current.length - 1; k >= 0; k--) {
                     const obs = obstaclesRef.current[k];
                     if (checkCircleRectCollision({x: nextX, y: nextY}, e.radius, obs.pos, obs.width, obs.height)) {
                         createExplosion(obs.pos, '#94a3b8', 20);
                         obstaclesRef.current.splice(k, 1); 
                         shakeRef.current = 10;
                         audioParams.playExplosion();
                     }
                 }
                 e.pos.x = nextX;
                 e.pos.y = nextY;
            } else {
                let canMoveX = true;
                for (const obs of obstaclesRef.current) {
                     if (checkCircleRectCollision({x: nextX, y: e.pos.y}, e.radius, obs.pos, obs.width, obs.height)) {
                         canMoveX = false; break;
                     }
                }
                if (canMoveX) e.pos.x = nextX;

                let canMoveY = true;
                for (const obs of obstaclesRef.current) {
                     if (checkCircleRectCollision({x: e.pos.x, y: nextY}, e.radius, obs.pos, obs.width, obs.height)) {
                         canMoveY = false; break;
                     }
                }
                if (canMoveY) e.pos.y = nextY;
                
                // Unstuck logic for big enemies
                if (!canMoveX && !canMoveY && (e.type === EnemyType.ELITE || e.type === EnemyType.TANK)) {
                     e.pos.x += Math.cos(angle + Math.PI/2) * speed * dtSec * 0.5;
                     e.pos.y += Math.sin(angle + Math.PI/2) * speed * dtSec * 0.5;
                }
            }
        } else {
            // Ghost moves freely
            e.pos.x = nextX;
            e.pos.y = nextY;
        }

        const dist = Math.hypot(p.pos.x - e.pos.x, p.pos.y - e.pos.y);
        if (dist < p.radius + e.radius) {
            e.pushback.x = -Math.cos(angle) * 300;
            e.pushback.y = -Math.sin(angle) * 300;

            if (e.type === EnemyType.EXPLODER) {
                e.hp = 0;
                createExplosion(e.pos, '#e11d48', 15);
                audioParams.playExplosion();
                if (p.invulnTimer <= 0) {
                    const dmg = e.damage * 1.5;
                    if (p.shield > 0) { p.shield = Math.max(0, p.shield - dmg); } 
                    else { p.hp -= dmg; }
                    p.invulnTimer = 0.5;
                }
                processKill(e); enemiesRef.current.splice(i,1); continue;
            }

            if (p.invulnTimer <= 0) {
                if (p.shield > 0) {
                    p.shield = Math.max(0, p.shield - e.damage);
                    p.shieldRegenTimer = 5;
                } else {
                    p.hp -= e.damage;
                    audioParams.playHit();
                    shakeRef.current = 10;
                }
                p.invulnTimer = 0.5; 
                if (p.thornsDamage > 0) {
                    e.hp -= p.thornsDamage;
                    spawnFloatingText(e.pos, `${Math.floor(p.thornsDamage)}`, '#fff', 12);
                }
            }
            if (p.hp <= 0) { setGameState(GameState.GAME_OVER); return; }
            if (e.hp <= 0) { processKill(e); enemiesRef.current.splice(i,1); continue; }
        }

        for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
            const b = bulletsRef.current[j];
            if (b.isMelee) {
                 const dx = e.pos.x - p.pos.x;
                 const dy = e.pos.y - p.pos.y;
                 const d = Math.sqrt(dx*dx + dy*dy);
                 
                 if (d < b.radius + e.radius) {
                     let hit = false;
                     
                     if (p.isGiantSaber) {
                         hit = true;
                     } else {
                         let ang = Math.atan2(dy, dx);
                         let swingAng = b.swingAngle || 0;
                         let diff = Math.abs(ang - swingAng);
                         if (diff > Math.PI) diff = Math.PI * 2 - diff;
                         if (diff < Math.PI / 3) hit = true;
                     }
                     
                     if (hit && !b.hitIds.includes(e.id)) {
                         b.hitIds.push(e.id);
                         e.hp -= b.damage;
                         e.pushback.x = Math.cos(Math.atan2(dy,dx)) * 300;
                         e.pushback.y = Math.sin(Math.atan2(dy,dx)) * 300;
                         createExplosion(e.pos, b.color, 5);
                         spawnFloatingText(e.pos, `${Math.floor(b.damage)}`, '#fff', 16);
                     }
                 }
            } 
            else {
                const d = Math.hypot(b.pos.x - e.pos.x, b.pos.y - e.pos.y);
                const hitR = b.radius + e.radius + (b.explodeRadius || 0);
                
                if (d < hitR) {
                    let dmg = b.damage;
                    if (b.isOrb && b.hitIds.includes(e.id) && Math.random() > 0.1) continue;
                    if (b.isOrb && Math.random() < 0.1) b.hitIds.push(e.id);
                    
                    // Improved Boomerang Hit Logic
                    if (b.isBoomerang) {
                        if (b.hitIds.includes(e.id)) {
                             // Internal cooldown per enemy for boomerang
                             // We simulate this by small chance to hit again or checking timestamp if we had one
                             // For simple arcade, 10% chance to re-hit same enemy per frame is okay
                             if (Math.random() > 0.1) continue;
                        } else {
                            b.hitIds.push(e.id);
                        }
                    }

                    if (b.isMine) {
                        createExplosion(b.pos, '#52525b', 10);
                        audioParams.playExplosion();
                    }

                    e.hp -= dmg;
                    if (b.freeze) e.frozenTimer = 2;
                    if (b.incendiary) e.burnTimer = 5;
                    
                    spawnFloatingText(e.pos, `${Math.floor(dmg)}`, '#fff', 12);
                    createExplosion(e.pos, b.color, 2);

                    if (!b.isOrb && !b.isMelee && !b.isBoomerang) {
                        if (b.explodeRadius > 0) {
                             bulletsRef.current.splice(j, 1);
                        } else {
                            b.pierce--;
                            if (b.pierce < 0) bulletsRef.current.splice(j, 1);
                        }
                    }
                }
            }
            if (e.hp <= 0) {
                 processKill(e); enemiesRef.current.splice(i,1); break;
            }
        }
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        if (pt.id === 'shockwave') { pt.radius += 15; pt.alpha -= 0.05; }
        else { pt.pos.x += pt.velocity.x; pt.pos.y += pt.velocity.y; pt.life -= 0.05; pt.alpha = pt.life; }
        if (pt.alpha <= 0) particlesRef.current.splice(i, 1);
    }
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.pos.y += ft.velocity.y; ft.life -= 0.02;
        if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
    }

    if (inputMode === InputMode.TOUCH && joystickRef.current.active && canvasRef.current) {
         const ctx = canvasRef.current.getContext('2d');
         if (ctx) {
             ctx.save();
             ctx.beginPath(); ctx.arc(joystickRef.current.origin.x, joystickRef.current.origin.y, 50, 0, Math.PI*2);
             ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
             ctx.beginPath(); ctx.arc(joystickRef.current.current.x, joystickRef.current.current.y, 20, 0, Math.PI*2);
             ctx.fillStyle = 'rgba(34,211,238,0.5)'; ctx.fill();
             ctx.restore();
         }
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [gameState, setGameState, setStats, setPlayerHp, setPlayerXp, setMaxXp, inputMode, setPlayerAttributes, setAbilityCooldown, recalculateStats]);

  const processKill = (e: Enemy) => {
      killsRef.current++;
      scoreRef.current += e.value;
      const isBoss = e.type.startsWith('BOSS');
      if (isBoss) {
          spawnFloatingText(e.pos, "ELIMINATED", "#fcd34d", 40);
          shakeRef.current = 50;
          audioParams.playLevelUp();
          for(let k=0; k<5; k++) spawnLoot({x: e.pos.x + randomRange(-50,50), y: e.pos.y + randomRange(-50,50), type: LootType.XP_ORB} as any, LootType.XP_ORB);
          spawnLoot(e.pos, LootType.HEALTH_PACK);
      }
      
      // Splitter Logic
      if (e.type === EnemyType.SPLITTER) {
          for (let k=0; k<2; k++) {
               enemiesRef.current.push({
                  id: 'MINI_'+Math.random(),
                  pos: { x: e.pos.x + randomRange(-10,10), y: e.pos.y + randomRange(-10,10) },
                  type: EnemyType.FAST,
                  radius: 8, color: '#bef264', // Lighter Lime
                  hp: 20, maxHp: 20, damage: 5, speed: 200,
                  value: 10, pushback: {x:0,y:0}
               });
          }
      }

      if (Math.random() < LOOT_CONFIG.dropChance) {
          spawnLoot(e.pos, Math.random() < LOOT_CONFIG.healthPackChance ? LootType.HEALTH_PACK : LootType.XP_ORB);
      } else {
          playerRef.current.xp += e.value;
          if (playerRef.current.xp >= playerRef.current.maxXp) {
              playerRef.current.xp -= playerRef.current.maxXp;
              playerRef.current.level++;
              playerRef.current.maxXp = Math.floor(XP_BASE * Math.pow(playerRef.current.level, XP_GROWTH_EXPONENT));
              onLevelUp();
          }
      }
  };

  const drawMinimap = (ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) => {
        const mapSize = 160;
        const margin = 20;
        const mapX = canvasW - mapSize - margin;
        const mapY = margin;
        const scaleX = mapSize / WORLD_WIDTH;
        const scaleY = mapSize / WORLD_HEIGHT;

        ctx.save();
        
        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillRect(mapX, mapY, mapSize, mapSize);
        ctx.strokeRect(mapX, mapY, mapSize, mapSize);

        // Player
        const p = playerRef.current;
        const px = mapX + p.pos.x * scaleX;
        const py = mapY + p.pos.y * scaleY;
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2); ctx.fill();

        // Obstacles
        ctx.fillStyle = '#475569';
        obstaclesRef.current.forEach(obs => {
             ctx.fillRect(mapX + obs.pos.x * scaleX, mapY + obs.pos.y * scaleY, obs.width * scaleX, obs.height * scaleY);
        });

        // Enemies
        enemiesRef.current.forEach(e => {
            if (e.type.startsWith('BOSS')) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.arc(mapX + e.pos.x*scaleX, mapY + e.pos.y*scaleY, 4, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillStyle = '#f87171';
                ctx.fillRect(mapX + e.pos.x*scaleX, mapY + e.pos.y*scaleY, 2, 2);
            }
        });

        // Loot
        ctx.fillStyle = '#fbbf24';
        lootRef.current.forEach(l => {
            ctx.fillRect(mapX + l.pos.x*scaleX, mapY + l.pos.y*scaleY, 1.5, 1.5);
        });

        // Current View Rect
        const cam = cameraRef.current;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        const vw = (canvasW / WORLD_WIDTH) * mapSize;
        const vh = (canvasH / WORLD_HEIGHT) * mapSize;
        ctx.strokeRect(mapX + cam.x*scaleX, mapY + cam.y*scaleY, vw, vh);

        ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = playerRef.current;
    const cam = cameraRef.current;

    const stage = STAGE_CONFIG[currentStageIndexRef.current];
    
    ctx.fillStyle = `hsl(${stage.hue}, 30%, 5%)`; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cam.x, -cam.y); 

    if (shakeRef.current > 0) {
        ctx.translate((Math.random()-0.5)*shakeRef.current, (Math.random()-0.5)*shakeRef.current);
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    ctx.strokeStyle = `hsla(${stage.hue}, 40%, 20%, 0.3)`;
    ctx.lineWidth = 2;
    const gridSize = 100;
    const startX = Math.floor(cam.x / gridSize) * gridSize;
    const startY = Math.floor(cam.y / gridSize) * gridSize;
    
    ctx.beginPath();
    for (let x = startX; x < cam.x + canvas.width; x+=gridSize) {
        if(x > WORLD_WIDTH) break;
        ctx.moveTo(x, Math.max(0, cam.y)); ctx.lineTo(x, Math.min(WORLD_HEIGHT, cam.y + canvas.height));
    }
    for (let y = startY; y < cam.y + canvas.height; y+=gridSize) {
        if(y > WORLD_HEIGHT) break;
        ctx.moveTo(Math.max(0, cam.x), y); ctx.lineTo(Math.min(WORLD_WIDTH, cam.x + canvas.width), y);
    }
    ctx.stroke();

    if (gameTimeRef.current % 10000 < 3000) {
        ctx.fillStyle = `hsla(${stage.hue}, 50%, 50%, 0.1)`;
        ctx.font = "bold 200px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(stage.name, WORLD_WIDTH/2, WORLD_HEIGHT/2);
    }

    obstaclesRef.current.forEach(obs => {
        if (obs.pos.x + obs.width < cam.x || obs.pos.x > cam.x + canvas.width ||
            obs.pos.y + obs.height < cam.y || obs.pos.y > cam.y + canvas.height) return;

        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.pos.x, obs.pos.y, obs.width, obs.height);
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(obs.pos.x + 8, obs.pos.y + obs.height, obs.width, 12);
        
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.pos.x, obs.pos.y, obs.width, obs.height);
        if (obs.type === 'RUIN') {
            ctx.beginPath();
            ctx.moveTo(obs.pos.x, obs.pos.y); ctx.lineTo(obs.pos.x + 30, obs.pos.y + 30);
            ctx.moveTo(obs.pos.x + obs.width, obs.pos.y); ctx.lineTo(obs.pos.x + obs.width - 30, obs.pos.y + 30);
            ctx.stroke();
        }
    });

    lootRef.current.forEach(l => {
        if (l.pos.x < cam.x - 20 || l.pos.x > cam.x + canvas.width + 20 || l.pos.y < cam.y - 20 || l.pos.y > cam.y + canvas.height + 20) return;
        ctx.fillStyle = l.color;
        const bounce = Math.sin(gameTimeRef.current/200 + l.floatOffset) * 4;
        ctx.beginPath(); 
        if (l.type === LootType.XP_ORB) {
            ctx.moveTo(l.pos.x, l.pos.y - 6 + bounce);
            ctx.lineTo(l.pos.x + 6, l.pos.y + bounce);
            ctx.lineTo(l.pos.x, l.pos.y + 6 + bounce);
            ctx.lineTo(l.pos.x - 6, l.pos.y + bounce);
        } else {
            const s = 4;
            ctx.rect(l.pos.x - s, l.pos.y - s*2 + bounce, s*2, s*4);
            ctx.rect(l.pos.x - s*2, l.pos.y - s + bounce, s*4, s*2);
        }
        ctx.fill();
    });

    // Enemy Projectiles
    enemyBulletsRef.current.forEach(b => {
         if (b.pos.x < cam.x || b.pos.x > cam.x + canvas.width || b.pos.y < cam.y || b.pos.y > cam.y + canvas.height) return;
         ctx.fillStyle = b.color;
         ctx.beginPath(); ctx.arc(b.pos.x - cam.x, b.pos.y - cam.y, b.radius, 0, Math.PI*2); ctx.fill();
         ctx.shadowColor = b.color; ctx.shadowBlur = 5; ctx.stroke(); ctx.shadowBlur = 0;
    });

    enemiesRef.current.forEach(e => {
        if (e.pos.x < cam.x - 60 || e.pos.x > cam.x + canvas.width + 60 || e.pos.y < cam.y - 60 || e.pos.y > cam.y + canvas.height + 60) return;
        
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        
        if (e.frozenTimer && e.frozenTimer > 0) ctx.fillStyle = '#a5f3fc';
        else if (e.burnTimer && e.burnTimer > 0) ctx.fillStyle = '#fb923c';
        else ctx.fillStyle = e.color;

        const angle = Math.atan2(p.pos.y - e.pos.y, p.pos.x - e.pos.x);
        ctx.rotate(angle);

        if (e.type === EnemyType.BASIC) {
            ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, 10); ctx.lineTo(-4, 0); ctx.lineTo(-6, -10); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = e.color; ctx.lineWidth = 2; const legOffset = Math.sin(gameTimeRef.current/100) * 4;
            ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(-10 + legOffset, 14); ctx.moveTo(-4, -5); ctx.lineTo(-10 - legOffset, -14); ctx.stroke();
        } else if (e.type === EnemyType.FAST) {
            ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = e.color; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-8, 14); ctx.lineTo(-4, 0); ctx.lineTo(-8, -14); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(-10, -2, 4, 4);
        } else if (e.type === EnemyType.GHOST) {
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(0,-4, 10, Math.PI, 0); ctx.lineTo(10, 10); ctx.lineTo(5, 5); ctx.lineTo(0, 10); ctx.lineTo(-5, 5); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, -4, 2, 0, Math.PI*2); ctx.arc(4, -4, 2, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (e.type === EnemyType.SPLITTER) {
             ctx.beginPath(); ctx.rect(-12,-12,24,24); ctx.fill();
             ctx.fillStyle = '#3f6212'; ctx.beginPath(); ctx.moveTo(-12,-12); ctx.lineTo(12,12); ctx.stroke();
        } else if (e.type === EnemyType.CHARGER) {
            ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fbbf24'; ctx.fillRect(-15, -4, 5, 8);
        } else if (e.type === EnemyType.TANK) {
            ctx.fillRect(-14, -14, 28, 28); ctx.fillStyle = '#1e293b'; ctx.fillRect(-8, -8, 16, 16); ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle = e.color; ctx.lineWidth = 4; ctx.strokeRect(-16, -16, 32, 32);
        } else if (e.type === EnemyType.SNIPER) {
            ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-10, 8); ctx.lineTo(-6, 0); ctx.lineTo(-10, -8); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.stroke();
            if ((e.attackTimer || 0) > 1.5) { 
                ctx.strokeStyle = '#e879f9'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(WORLD_WIDTH, 0); ctx.stroke();
            }
        } else if (e.type === EnemyType.EXPLODER) {
             const pScale = 1 + Math.sin(gameTimeRef.current/100)*0.2;
             ctx.scale(pScale, pScale);
             ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
             ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5,-5); ctx.lineTo(5,5); ctx.moveTo(5,-5); ctx.lineTo(-5,5); ctx.stroke();
        } else if (e.type === EnemyType.ELITE) {
            ctx.beginPath(); ctx.arc(0,0, 18, 0, Math.PI*2); ctx.fill();
            const spikes = 8; ctx.beginPath();
            for(let k=0; k<spikes; k++) { const a = (Math.PI*2/spikes) * k + (gameTimeRef.current/300); ctx.moveTo(Math.cos(a)*18, Math.sin(a)*18); ctx.lineTo(Math.cos(a)*30, Math.sin(a)*30); }
            ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5,0,5,0,Math.PI*2); ctx.fill();
        } else if (e.type.startsWith('BOSS')) {
            const isGoliath = e.type === EnemyType.BOSS_GOLIATH;
            const isSwarmer = e.type === EnemyType.BOSS_SWARMER;
            
            // Enraged effect
            if (e.isEnraged) {
                ctx.shadowColor = e.color; ctx.shadowBlur = 20;
            }

            ctx.strokeStyle = e.color; ctx.lineWidth = 6; ctx.setLineDash([20, 10]);
            ctx.beginPath(); ctx.arc(0,0, e.radius - 10, gameTimeRef.current/500, gameTimeRef.current/500 + Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
            
            ctx.fillStyle = e.color; 
            if (isGoliath) ctx.fillRect(-40, -40, 80, 80);
            else if (isSwarmer) { ctx.beginPath(); for(let k=0; k<3; k++) { const a = (Math.PI*2/3)*k + gameTimeRef.current/200; ctx.lineTo(Math.cos(a)*50, Math.sin(a)*50); } ctx.fill(); }
            else { ctx.beginPath(); ctx.arc(0,0, 60, 0, Math.PI*2); ctx.fill(); } 

            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0, 15, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(Math.cos(gameTimeRef.current/200)*5, Math.sin(gameTimeRef.current/200)*5, 5, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();

        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        if (e.hp < e.maxHp) {
            const pct = Math.max(0, e.hp / e.maxHp);
            const barW = e.radius * 2;
            const barY = -e.radius - 12;
            ctx.fillStyle = '#333'; ctx.fillRect(-barW/2, barY, barW, 4);
            ctx.fillStyle = e.type.startsWith('BOSS') ? '#ef4444' : '#fbbf24'; 
            ctx.fillRect(-barW/2, barY, barW * pct, 4);
        }
        ctx.restore();
    });

    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    
    // Draw Static Field
    if (p.staticFieldRange > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, p.staticFieldRange, 0, Math.PI*2);
        ctx.strokeStyle = p.isThunderGod ? '#60a5fa' : 'rgba(96, 165, 250, 0.3)';
        ctx.lineWidth = p.isThunderGod ? 3 : 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Static arcs
        if (Math.random() < 0.2) {
             const angle = Math.random() * Math.PI * 2;
             const r = Math.random() * p.staticFieldRange;
             ctx.strokeStyle = '#93c5fd';
             ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r); ctx.stroke();
        }
    }

    // Draw Drones
    if (p.droneCount > 0) {
        for(let i=0; i<p.droneCount; i++) {
             const droneAngle = (gameTimeRef.current/500) + (i * (Math.PI*2/p.droneCount));
             const dx = Math.cos(droneAngle) * 50;
             const dy = Math.sin(droneAngle) * 50;
             ctx.save();
             ctx.translate(dx, dy);
             ctx.fillStyle = p.isAssaultDrone ? '#f59e0b' : '#34d399';
             ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(-4, 4); ctx.lineTo(-2, 0); ctx.lineTo(-4, -4); ctx.fill();
             ctx.restore();
        }
    }
    
    if (p.invulnTimer > 0 && Math.floor(gameTimeRef.current / 100) % 2 === 0) {
        ctx.globalAlpha = 0.4;
    }

    if (p.magnetRadius > 100) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.arc(0,0,p.magnetRadius,0,Math.PI*2); ctx.stroke();
    }

    ctx.save();
    if (!p.autoAim && STARTER_WEAPONS.find(w=>w.id===p.inventory[p.activeWeaponIndex])?.type === WeaponType.RANGED) {
        ctx.rotate(p.angle); 
    }
    if (avatarImageRef.current) {
        ctx.beginPath(); ctx.arc(0,0,p.radius,0,Math.PI*2); ctx.clip();
        ctx.drawImage(avatarImageRef.current, -p.radius, -p.radius, p.radius*2, p.radius*2);
    } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0,0,p.radius,0,Math.PI*2); ctx.fill();
        
        ctx.fillStyle = '#333';
        ctx.fillRect(p.radius - 5, -4, 12, 8);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(p.radius - 5, -2, 10, 4);
    }
    ctx.restore();

    if (p.shield > 0) {
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 + (p.shield/p.maxShield)*0.4})`;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,p.radius+6,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore(); 
    ctx.globalAlpha = 1.0; 

    bulletsRef.current.forEach(b => {
        if (b.pos.x < cam.x || b.pos.x > cam.x + canvas.width || b.pos.y < cam.y || b.pos.y > cam.y + canvas.height) return;
        
        ctx.save();
        ctx.translate(b.pos.x, b.pos.y);
        
        if (b.isMelee) {
            if (p.isGiantSaber) {
                ctx.beginPath();
                ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
                ctx.lineWidth = 20 * (b.duration! / b.maxDuration!);
                ctx.strokeStyle = b.color;
                ctx.globalAlpha = 0.5 + (0.3 * Math.sin(gameTimeRef.current/50));
                ctx.stroke();
            } else {
                const arcStart = b.swingAngle! - Math.PI/4;
                const arcEnd = b.swingAngle! + Math.PI/4;
                ctx.beginPath();
                ctx.arc(0, 0, b.radius, arcStart, arcEnd);
                ctx.lineWidth = 20 * (b.duration! / b.maxDuration!); 
                ctx.strokeStyle = b.color;
                ctx.globalAlpha = 0.6;
                ctx.stroke();
            }
        } else if (b.isMine) {
            if (b.isGravityWell) {
                 // Black hole effect
                 ctx.fillStyle = '#000';
                 ctx.beginPath(); ctx.arc(0,0, 10, 0, Math.PI*2); ctx.fill();
                 ctx.strokeStyle = '#a855f7'; 
                 ctx.lineWidth = 2;
                 ctx.beginPath(); ctx.arc(0,0, 15 + Math.sin(gameTimeRef.current/100)*5, 0, Math.PI*2); ctx.stroke();
            } else {
                ctx.fillStyle = b.color;
                ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth=2;
                const blink = Math.sin(gameTimeRef.current/100) > 0;
                if (blink) ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.stroke();
            }
        } else if (b.isBoomerang) {
            ctx.rotate(gameTimeRef.current/20); // Fast spin
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color; ctx.shadowBlur = 10;
            
            // Draw Cross Blade
            const s = b.radius;
            ctx.beginPath();
            ctx.moveTo(-s, -s/3); ctx.lineTo(-s/3, -s); ctx.lineTo(0, -s/3); 
            ctx.lineTo(s/3, -s); ctx.lineTo(s, -s/3); ctx.lineTo(s/3, 0);
            ctx.lineTo(s, s/3); ctx.lineTo(s/3, s); ctx.lineTo(0, s/3);
            ctx.lineTo(-s/3, s); ctx.lineTo(-s, s/3); ctx.lineTo(-s/3, 0);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (b.isDroneShot) {
            ctx.fillStyle = b.color;
            ctx.fillRect(-2, -2, 4, 8);
        } else {
            if (b.isOrb && p.isNovaOrbs && b.radius > 12) {
                ctx.shadowColor = b.color;
                ctx.shadowBlur = 20 + Math.sin(gameTimeRef.current/100)*10;
                ctx.fillStyle = '#fff'; 
                ctx.globalAlpha = 0.8;
                ctx.beginPath(); ctx.arc(0,0, b.radius, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillStyle = b.color;
                ctx.beginPath(); ctx.arc(0,0, b.radius, 0, Math.PI*2); ctx.fill();
                ctx.shadowColor = b.color; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
            }
        }
        ctx.restore();
    });

    particlesRef.current.forEach(pt => {
        if (pt.pos.x < cam.x || pt.pos.x > cam.x + canvas.width || pt.pos.y < cam.y || pt.pos.y > cam.y + canvas.height) return;
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        if (pt.id === 'shockwave') {
            ctx.beginPath(); ctx.arc(pt.pos.x, pt.pos.y, pt.radius, 0, Math.PI*2); ctx.strokeStyle=pt.color; ctx.lineWidth=4; ctx.stroke();
        } else {
            ctx.beginPath(); ctx.arc(pt.pos.x, pt.pos.y, pt.radius, 0, Math.PI*2); ctx.fill();
        }
    });
    ctx.globalAlpha = 1;

    floatingTextsRef.current.forEach(ft => {
        if (ft.pos.x < cam.x || ft.pos.x > cam.x + canvas.width || ft.pos.y < cam.y || ft.pos.y > cam.y + canvas.height) return;
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px monospace`;
        ctx.fillText(ft.text, ft.pos.x, ft.pos.y);
    });

    ctx.restore(); 
    
    // UI Layer - Minimap
    drawMinimap(ctx, canvas.width, canvas.height);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === ' ' && gameState === GameState.PLAYING) triggerShockwave();
      if (e.key.toLowerCase() === 'q' && gameState === GameState.PLAYING && canSwitchRef.current) {
          handleSwitchWeapon(); canSwitchRef.current = false;
      }
      if (e.key === 'Escape') {
          if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
          else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
      }
  };
  const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); if(e.key.toLowerCase()==='q') canSwitchRef.current=true; };
  const handleMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseDown = () => { mouseDownRef.current = true; };
  const handleMouseUp = () => { mouseDownRef.current = false; };
  
  const handleTouchStart = (e: TouchEvent) => {
      if (inputMode !== InputMode.TOUCH || gameState !== GameState.PLAYING) return;
      const target = e.target as HTMLElement;
      if (target.closest('button')) return; 
      e.preventDefault();
      for(let i=0; i<e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (!joystickRef.current.active) {
              joystickRef.current.active = true;
              joystickRef.current.touchId = t.identifier;
              joystickRef.current.origin = {x: t.clientX, y: t.clientY};
              joystickRef.current.current = {x: t.clientX, y: t.clientY};
              joystickRef.current.vector = {x:0,y:0};
          }
      }
  };
  const handleTouchMove = (e: TouchEvent) => {
      if (inputMode !== InputMode.TOUCH || !joystickRef.current.active) return;
      e.preventDefault();
      for(let i=0; i<e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === joystickRef.current.touchId) {
              let dx = t.clientX - joystickRef.current.origin.x;
              let dy = t.clientY - joystickRef.current.origin.y;
              const dist = Math.hypot(dx, dy);
              const maxDist = 60;
              if (dist > maxDist) { dx = (dx/dist)*maxDist; dy = (dy/dist)*maxDist; }
              joystickRef.current.current = {x: joystickRef.current.origin.x + dx, y: joystickRef.current.origin.y + dy};
              joystickRef.current.vector = {x: dx/maxDist, y: dy/maxDist};
          }
      }
  };
  const handleTouchEnd = (e: TouchEvent) => {
      if (inputMode !== InputMode.TOUCH) return;
      for(let i=0; i<e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joystickRef.current.touchId) {
              joystickRef.current.active = false; joystickRef.current.touchId = null; joystickRef.current.vector={x:0,y:0};
          }
      }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    const c = canvasRef.current;
    if(c) { c.width = window.innerWidth; c.height = window.innerHeight; }

    window.addEventListener('touchstart', handleTouchStart, {passive: false});
    window.addEventListener('touchmove', handleTouchMove, {passive: false});
    window.addEventListener('touchend', handleTouchEnd);

    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, inputMode, update]);

  return <canvas ref={canvasRef} className="block w-full h-full" />;
});

GameCanvas.displayName = 'GameCanvas';
