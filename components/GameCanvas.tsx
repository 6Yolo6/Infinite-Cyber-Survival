
import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GameState, Player, Enemy, Projectile, Particle, GameStats, EnemyType, Vector2, Upgrade, UpgradeType, Loot, LootType, FloatingText, PlayerAttributes, InputMode } from '../types';
import { PLAYER_STATS, ENEMY_CONFIG, WAVE_INTERVAL, XP_BASE, XP_GROWTH_EXPONENT, STARTER_WEAPONS, LOOT_CONFIG } from '../constants';
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
}

export interface GameCanvasHandle {
  applyUpgrade: (upgrade: Upgrade) => void;
  startGame: (weaponId: string) => void;
  triggerAbility: () => void;
}

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const getZoneTheme = (zoneIndex: number) => {
  const seed = zoneIndex * 9999 + 1337;
  const rnd = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  const patternTypes = ['GRID', 'RAIN', 'CROSS', 'CIRCLES', 'DIAGONAL'];
  const pattern = patternTypes[Math.floor(rnd(0) * patternTypes.length)];
  return {
    pattern,
    density: 40 + rnd(1) * 80, 
    speedMod: 0.5 + rnd(2) * 2.0,
    angleOffset: rnd(3) * Math.PI,
    hasPulse: rnd(4) > 0.3,
  };
};

const MAX_ENEMIES = 150; 

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
  volume
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
  
  const currentZoneRef = useRef<number>(1);
  const zoneTransitionTimerRef = useRef<number>(0); 
  
  // Entities
  const playerRef = useRef<Player>({
    id: 'player',
    pos: { x: 0, y: 0 },
    radius: PLAYER_STATS.radius,
    color: PLAYER_STATS.color,
    speed: PLAYER_STATS.baseSpeed,
    hp: PLAYER_STATS.baseMaxHp,
    maxHp: PLAYER_STATS.baseMaxHp,
    angle: 0,
    weaponId: 'standard',
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    bulletSpeedMultiplier: 1,
    projectileCount: 1,
    piercing: 0,
    blastRadius: 0,
    autoAim: false,
    shield: 0,
    maxShield: 0,
    shieldRegenDelay: 3,
    shieldRegenTimer: 0,
    magnetRadius: PLAYER_STATS.baseMagnetRadius,
    thornsDamage: 0,
    hpRegen: 0,
    shockwaveCooldown: PLAYER_STATS.baseShockwaveCooldown,
    shockwaveTimer: 0,
    xp: 0,
    maxXp: XP_BASE,
    level: 1,
    upgrades: {},
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lootRef = useRef<Loot[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  
  // Inputs
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<Vector2>({ x: 0, y: 0 });
  const isMouseDownRef = useRef<boolean>(false);
  const lastFireTimeRef = useRef<number>(0);

  // Mobile Joystick State
  const joystickRef = useRef<{
      active: boolean;
      touchId: number | null;
      origin: Vector2; // Center of the joystick
      current: Vector2; // Current touch position
      vector: Vector2; // Normalized -1 to 1
  }>({ active: false, touchId: null, origin: {x:0,y:0}, current: {x:0,y:0}, vector: {x:0,y:0} });

  // Stats Tracking
  const gameTimeRef = useRef<number>(0);
  const killsRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const difficultyRef = useRef<number>(1);

  // Audio update when volume prop changes
  useEffect(() => {
    audioParams.setVolume(volume);
  }, [volume]);

  const resetGame = useCallback((weaponId: string = 'standard') => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const weaponConfig = STARTER_WEAPONS.find(w => w.id === weaponId) || STARTER_WEAPONS[0];

    // Force autoAim on Mobile (TOUCH mode)
    const shouldAutoAim = inputMode === InputMode.TOUCH ? true : (weaponConfig.autoAim || false);

    playerRef.current = {
      id: 'player',
      pos: { x: w / 2, y: h / 2 },
      radius: PLAYER_STATS.radius,
      color: weaponConfig.color || PLAYER_STATS.color,
      speed: PLAYER_STATS.baseSpeed,
      angle: 0,
      weaponId: weaponId,
      hp: weaponConfig.stats.hp || PLAYER_STATS.baseMaxHp,
      maxHp: weaponConfig.stats.maxHp || PLAYER_STATS.baseMaxHp,
      damageMultiplier: weaponConfig.stats.damageMultiplier || 1,
      fireRateMultiplier: weaponConfig.stats.fireRateMultiplier || 1,
      bulletSpeedMultiplier: weaponConfig.stats.bulletSpeedMultiplier || 1,
      projectileCount: weaponConfig.stats.projectileCount || 1,
      piercing: weaponConfig.stats.piercing || 0,
      blastRadius: weaponConfig.stats.blastRadius || 0,
      autoAim: shouldAutoAim,
      shield: PLAYER_STATS.baseShield,
      maxShield: PLAYER_STATS.baseShield,
      shieldRegenDelay: 3,
      shieldRegenTimer: 0,
      magnetRadius: PLAYER_STATS.baseMagnetRadius,
      thornsDamage: PLAYER_STATS.baseThorns,
      hpRegen: PLAYER_STATS.baseRegen,
      shockwaveCooldown: PLAYER_STATS.baseShockwaveCooldown,
      shockwaveTimer: 0,
      xp: 0,
      maxXp: XP_BASE,
      level: 1,
      upgrades: {},
    };

    enemiesRef.current = [];
    bulletsRef.current = [];
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
    currentZoneRef.current = 1;
    zoneTransitionTimerRef.current = 3;
    
    setStats({ score: 0, kills: 0, timeAlive: 0, difficulty: 1, playerLevel: 1 });
    setPlayerHp(playerRef.current.hp);
    setPlayerMaxHp(playerRef.current.maxHp);
    setPlayerXp(0);
    setMaxXp(XP_BASE);
    setAbilityCooldown({current: 0, max: PLAYER_STATS.baseShockwaveCooldown});
    
    audioParams.setVolume(volume);
  }, [setStats, setPlayerHp, setPlayerMaxHp, setPlayerXp, setMaxXp, volume, inputMode]);

  // Shockwave Ability
  const triggerShockwave = useCallback(() => {
      const p = playerRef.current;
      if (p.shockwaveTimer > 0) return;

      p.shockwaveTimer = p.shockwaveCooldown;
      
      // Visuals
      createExplosion(p.pos, '#06b6d4', 30); // Cyan explosion
      shakeRef.current = 20;
      audioParams.playExplosion(); // Or a specific shockwave sound if we had one

      // Logic: Push enemies back and deal damage
      const range = 250;
      const dmg = 50 * (p.damageMultiplier);

      // Add a visual "ring" particle (simulated by logic for now, or added to particle system)
      particlesRef.current.push({
          id: 'shockwave',
          pos: {...p.pos},
          radius: 1, // Grows
          color: 'rgba(6, 182, 212, 0.5)',
          velocity: {x:0, y:0},
          life: 100, // Special marker for drawing ring, not normal particle logic
          maxLife: 100,
          alpha: 1
      });

      enemiesRef.current.forEach(e => {
          const dx = e.pos.x - p.pos.x;
          const dy = e.pos.y - p.pos.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < range) {
              e.hp -= dmg;
              spawnFloatingText(e.pos, `${Math.floor(dmg)}`, '#06b6d4', 16);
              
              // Pushback
              const pushForce = 100 * (1 - dist/range);
              const angle = Math.atan2(dy, dx);
              e.pos.x += Math.cos(angle) * pushForce;
              e.pos.y += Math.sin(angle) * pushForce;
          }
      });

      spawnFloatingText(p.pos, "EMP BLAST!", '#06b6d4', 24);

  }, []);

  useImperativeHandle(ref, () => ({
    startGame: (weaponId: string) => {
      resetGame(weaponId);
      setGameState(GameState.PLAYING);
    },
    triggerAbility: () => {
        if (gameState === GameState.PLAYING) triggerShockwave();
    },
    applyUpgrade: (upgrade: Upgrade) => {
      const p = playerRef.current;
      // Track upgrades count
      p.upgrades[upgrade.type] = (p.upgrades[upgrade.type] || 0) + 1;

      switch (upgrade.type) {
        case UpgradeType.DAMAGE: p.damageMultiplier += 0.2; break;
        case UpgradeType.FIRE_RATE: p.fireRateMultiplier *= 0.85; break;
        case UpgradeType.SPEED: p.speed *= 1.1; break;
        case UpgradeType.HEALTH: 
          p.maxHp += 30; 
          p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.3));
          setPlayerMaxHp(p.maxHp);
          break;
        case UpgradeType.MULTISHOT: 
          p.projectileCount += 1; 
          p.damageMultiplier *= 0.9; 
          break;
        case UpgradeType.BULLET_SPEED: p.bulletSpeedMultiplier *= 1.25; break;
        case UpgradeType.LASER: p.piercing += 2; p.bulletSpeedMultiplier *= 1.3; break;
        case UpgradeType.ROCKET: 
          p.blastRadius += 40; 
          p.damageMultiplier *= 1.5; 
          p.fireRateMultiplier *= 1.2; 
          break;
        case UpgradeType.SHIELD:
          p.maxShield += 25;
          p.shield = p.maxShield; // Instantly fill new capacity
          spawnFloatingText(p.pos, "SHIELD UP", "#3b82f6", 16);
          break;
        case UpgradeType.MAGNET:
          p.magnetRadius *= 1.5;
          break;
        case UpgradeType.THORNS:
          p.thornsDamage += 15;
          break;
        case UpgradeType.REGEN:
          p.hpRegen += 1;
          break;
      }
      createExplosion(p.pos, '#22d3ee', 20);
      setPlayerHp(p.hp);
      audioParams.playLevelUp();
    }
  }));

  const spawnEnemy = (currentTimeSec: number) => {
    if (enemiesRef.current.length >= MAX_ENEMIES) return;

    const level = 1 + (currentTimeSec / 60);
    const hpMultiplier = level * 1.1; 
    const scoreMultiplier = level;
    const speedMultiplier = Math.min(2.0, 1 + (level - 1) * 0.05); 

    const availableTypes = Object.values(EnemyType).filter(type => 
      currentTimeSec >= ENEMY_CONFIG[type].minTime
    );
    
    let selectedType = EnemyType.BASIC;
    const roll = Math.random();
    const eliteChance = Math.min(0.4, Math.max(0, (currentTimeSec - 120) / 300));
    const tankChance = Math.min(0.3, Math.max(0, (currentTimeSec - 60) / 180));
    const fastChance = 0.3;

    if (availableTypes.includes(EnemyType.ELITE) && roll < eliteChance) selectedType = EnemyType.ELITE;
    else if (availableTypes.includes(EnemyType.TANK) && roll < (eliteChance + tankChance)) selectedType = EnemyType.TANK;
    else if (availableTypes.includes(EnemyType.FAST) && roll < (eliteChance + tankChance + fastChance)) selectedType = EnemyType.FAST;

    const config = ENEMY_CONFIG[selectedType];
    const edge = Math.floor(Math.random() * 4); 
    let x = 0, y = 0;
    const buffer = 60;
    const w = canvasRef.current?.width || window.innerWidth;
    const h = canvasRef.current?.height || window.innerHeight;
    
    if (edge === 0) { x = randomRange(0, w); y = -buffer; }
    else if (edge === 1) { x = w + buffer; y = randomRange(0, h); }
    else if (edge === 2) { x = randomRange(0, w); y = h + buffer; }
    else { x = -buffer; y = randomRange(0, h); }

    enemiesRef.current.push({
      id: Math.random().toString(36).substring(2, 11),
      pos: { x, y },
      type: selectedType,
      radius: config.radius,
      color: config.color,
      maxHp: Math.floor(config.baseHp * hpMultiplier),
      hp: Math.floor(config.baseHp * hpMultiplier),
      damage: Math.floor(config.baseDamage * hpMultiplier),
      speed: config.baseSpeed * speedMultiplier,
      value: Math.ceil(config.xpValue * scoreMultiplier),
    });
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
          life: 1.0,
          velocity: { x: (Math.random() - 0.5) * 1, y: -2 }, // Float up
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

    const safeDelta = Math.min(deltaTime, 100);
    const dtSec = safeDelta / 1000;

    gameTimeRef.current += safeDelta;
    const timeInSeconds = gameTimeRef.current / 1000;
    const difficulty = 1 + (timeInSeconds / 60);
    difficultyRef.current = difficulty;

    // Zone Transition
    const calculatedZone = Math.floor(difficulty);
    if (calculatedZone > currentZoneRef.current) {
      currentZoneRef.current = calculatedZone;
      zoneTransitionTimerRef.current = 4.0; 
      shakeRef.current = 30;
    }
    if (zoneTransitionTimerRef.current > 0) zoneTransitionTimerRef.current -= dtSec;
    if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current * 0.9);

    const p = playerRef.current;
    
    // Ability Cooldown
    if (p.shockwaveTimer > 0) {
        p.shockwaveTimer -= dtSec;
    }
    
    // Shield Regen
    if (p.shieldRegenTimer > 0) {
      p.shieldRegenTimer -= dtSec;
    } else if (p.shield < p.maxShield) {
      p.shield = Math.min(p.maxShield, p.shield + (p.maxShield * 0.2 * dtSec));
    }

    // HP Regen
    if (p.hpRegen > 0) {
      regenTimerRef.current += dtSec;
      if (regenTimerRef.current >= 1.0) {
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + p.hpRegen);
          spawnFloatingText(p.pos, `+${p.hpRegen}`, '#4ade80', 10);
        }
        regenTimerRef.current = 0;
      }
    }

    // UI Sync
    if (timestamp - lastUiUpdateRef.current > 100) {
      setStats({
        score: scoreRef.current,
        kills: killsRef.current,
        timeAlive: timeInSeconds,
        difficulty: difficulty,
        playerLevel: playerRef.current.level
      });
      setPlayerHp(playerRef.current.hp);
      setPlayerXp(playerRef.current.xp);
      setMaxXp(playerRef.current.maxXp);
      setAbilityCooldown({current: playerRef.current.shockwaveTimer, max: playerRef.current.shockwaveCooldown});
      lastUiUpdateRef.current = timestamp;
    }

    spawnTimerRef.current += safeDelta;
    const spawnRate = Math.max(150, WAVE_INTERVAL - (difficulty * 100));
    if (spawnTimerRef.current > spawnRate) {
      spawnEnemy(timeInSeconds);
      spawnTimerRef.current = 0;
    }

    lootTimerRef.current += safeDelta;
    if (lootTimerRef.current > 20000) {
        const w = canvasRef.current?.width || 800;
        const h = canvasRef.current?.height || 600;
        spawnLoot({x: randomRange(50, w-50), y: randomRange(50, h-50)}, LootType.HEALTH_PACK);
        spawnLoot({x: randomRange(50, w-50), y: randomRange(50, h-50)}, LootType.XP_ORB);
        spawnFloatingText(playerRef.current.pos, "SUPPLY DROP", "#ffffff", 20);
        lootTimerRef.current = 0;
    }

    const player = playerRef.current;
    const canvasW = canvasRef.current?.width || window.innerWidth;
    const canvasH = canvasRef.current?.height || window.innerHeight;

    // Player Movement Logic
    let dx = 0; let dy = 0;
    
    if (inputMode === InputMode.TOUCH && joystickRef.current.active) {
        // Use Joystick Vector
        dx = joystickRef.current.vector.x;
        dy = joystickRef.current.vector.y;
        // On touch, we allow full speed movement based on joystick tilt, but for this simple implementation
        // we'll treat it as binary max speed if pushing, or proportional. 
        // Let's do proportional for better feel.
        // Actually, dx/dy here is usually normalized direction * 1. 
        // We should multiply by speed.
    } else {
        // Use Keyboard
        if (keysRef.current.has('w') || keysRef.current.has('arrowup')) dy -= 1;
        if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) dy += 1;
        if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) dx -= 1;
        if (keysRef.current.has('d') || keysRef.current.has('arrowright')) dx += 1;
        
        // Normalize diagonal
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len;
            dy /= len;
        }
    }

    if (dx !== 0 || dy !== 0) {
      player.pos.x += dx * player.speed;
      player.pos.y += dy * player.speed;
    }
    player.pos.x = Math.max(player.radius, Math.min(canvasW - player.radius, player.pos.x));
    player.pos.y = Math.max(player.radius, Math.min(canvasH - player.radius, player.pos.y));

    // Firing Logic
    const canFire = timestamp - lastFireTimeRef.current > (PLAYER_STATS.baseFireRate * player.fireRateMultiplier);
    // In Touch mode, we always fire. In PC mode, mouse down.
    let shouldFire = inputMode === InputMode.TOUCH ? true : isMouseDownRef.current;
    let aimAngle = 0;

    if (player.autoAim) {
        // Find nearest enemy
        let nearestDist = Infinity;
        let nearestEnemy: Enemy | null = null;
        enemiesRef.current.forEach(e => {
            const d = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y);
            if (d < nearestDist) {
                nearestDist = d;
                nearestEnemy = e;
            }
        });
        
        if (nearestEnemy && nearestDist < 800) { // Increased auto-aim range for mobile feel
            aimAngle = Math.atan2(nearestEnemy.pos.y - player.pos.y, nearestEnemy.pos.x - player.pos.x);
            // If auto-aim is active, we force fire if an enemy is in range, even if not holding mouse (for mobile)
            // For PC with auto-aim weapon, we still require mouse down usually, but standardizing "Auto" means Auto.
            if (inputMode === InputMode.TOUCH) shouldFire = true;
        } else {
             // If no enemy, mobile auto-aim usually shoots forward or random? 
             // Or just doesn't shoot. Let's stop shooting if no enemy to save ears.
             if (inputMode === InputMode.TOUCH) shouldFire = false; 
             // Or preserve last angle
             aimAngle = player.angle;
        }
    } else {
        // Manual Aim (PC Only typically)
        aimAngle = Math.atan2(mouseRef.current.y - player.pos.y, mouseRef.current.x - player.pos.x);
    }
    player.angle = aimAngle;

    if (shouldFire && canFire) {
      const count = player.projectileCount;
      
      if (player.blastRadius > 0) audioParams.playRocket();
      else if (player.piercing > 0) audioParams.playLaser();
      else audioParams.playShoot(1.0 + Math.random() * 0.2);

      for (let i = 0; i < count; i++) {
         const offset = count === 1 ? 0 : (i - (count - 1) / 2) * 0.17;
         const fireAngle = aimAngle + offset;

         bulletsRef.current.push({
            id: Math.random().toString(),
            pos: { ...player.pos },
            radius: player.blastRadius > 0 ? PLAYER_STATS.bulletRadius * 2 : PLAYER_STATS.bulletRadius,
            color: player.blastRadius > 0 ? '#f97316' : (player.piercing > 0 ? '#d8b4fe' : player.color),
            velocity: {
              x: Math.cos(fireAngle) * PLAYER_STATS.baseBulletSpeed * player.bulletSpeedMultiplier,
              y: Math.sin(fireAngle) * PLAYER_STATS.baseBulletSpeed * player.bulletSpeedMultiplier
            },
            damage: PLAYER_STATS.baseDamage * player.damageMultiplier,
            pierce: player.piercing,
            explodeRadius: player.blastRadius,
            hitIds: []
          });
      }
      lastFireTimeRef.current = timestamp;
    }

    // Bullets, Loot, Enemies (Collision Logic remains largely same)
    // ... (Omitting full duplication for brevity, assuming standard update logic persists)
    // We need to include the logic for the new "Shockwave Ring" particle special case
    
    // --- Standard Update Loop Logic (Simplified for diff) ---
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const b = bulletsRef.current[i];
      b.pos.x += b.velocity.x;
      b.pos.y += b.velocity.y;
      if (b.pos.x < -50 || b.pos.x > canvasW + 50 || b.pos.y < -50 || b.pos.y > canvasH + 50) {
        bulletsRef.current.splice(i, 1);
      }
    }

    // Loot
    for (let i = lootRef.current.length - 1; i >= 0; i--) {
        const item = lootRef.current[i];
        item.life -= dtSec;
        if (item.life <= 0) { lootRef.current.splice(i, 1); continue; }
        const dist = Math.hypot(player.pos.x - item.pos.x, player.pos.y - item.pos.y);
        if (dist < player.magnetRadius) { 
            const pullSpeed = 5 + (player.magnetRadius - dist) * 0.1;
            item.pos.x += (player.pos.x - item.pos.x) * 0.1 * (pullSpeed / 5);
            item.pos.y += (player.pos.y - item.pos.y) * 0.1 * (pullSpeed / 5);
            if (dist < player.radius + item.radius) {
                if (item.type === LootType.XP_ORB) {
                    player.xp += item.value;
                    spawnFloatingText(player.pos, `+${item.value} XP`, '#fbbf24', 12);
                    audioParams.playPickupXP();
                    checkLevelUp();
                } else if (item.type === LootType.HEALTH_PACK) {
                    const heal = item.value;
                    player.hp = Math.min(player.maxHp, player.hp + heal);
                    spawnFloatingText(player.pos, `+${heal} HP`, '#22c55e', 14);
                    audioParams.playPickupHealth();
                }
                lootRef.current.splice(i, 1);
            }
        }
    }

    // Enemies
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const enemy = enemiesRef.current[i];
      const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
      enemy.pos.x += Math.cos(angle) * enemy.speed;
      enemy.pos.y += Math.sin(angle) * enemy.speed;

      const distToPlayer = Math.hypot(player.pos.x - enemy.pos.x, player.pos.y - enemy.pos.y);
      if (distToPlayer < player.radius + enemy.radius) {
        let incomingDmg = enemy.damage;
        let shieldAbsorbed = 0;
        if (player.shield > 0) {
            shieldAbsorbed = Math.min(player.shield, incomingDmg);
            player.shield -= shieldAbsorbed;
            incomingDmg -= shieldAbsorbed;
            spawnFloatingText(player.pos, `ABSORB`, '#3b82f6', 14);
        }
        if (incomingDmg > 0) {
            player.hp -= incomingDmg;
            spawnFloatingText(player.pos, `-${incomingDmg}`, '#ef4444', 20);
            audioParams.playHit();
        }
        player.shieldRegenTimer = player.shieldRegenDelay;
        if (player.thornsDamage > 0) {
            enemy.hp -= player.thornsDamage;
            spawnFloatingText(enemy.pos, `${player.thornsDamage}`, '#a8a29e', 14);
            createExplosion(enemy.pos, '#a8a29e', 3);
            if (enemy.hp <= 0) {
                processKill(enemy);
                enemiesRef.current.splice(i, 1);
            }
        }
        shakeRef.current = 15;
        createExplosion(player.pos, '#ef4444', 5);
        if (enemiesRef.current[i]) enemiesRef.current.splice(i, 1);
        if (player.hp <= 0) {
          setGameState(GameState.GAME_OVER);
          return;
        }
        continue;
      }

      // Bullet Hits
      for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
        const bullet = bulletsRef.current[j];
        const dist = Math.hypot(bullet.pos.x - enemy.pos.x, bullet.pos.y - enemy.pos.y);
        const hitRadius = bullet.pierce > 0 ? bullet.radius + 10 : bullet.radius + 5;

        if (dist < hitRadius + enemy.radius) {
          if (bullet.pierce > 0 && bullet.hitIds.includes(enemy.id)) continue;
          let damageDealt = Math.floor(bullet.damage);
          if (bullet.explodeRadius > 0) {
            createExplosion(enemy.pos, '#f97316', 15);
            audioParams.playExplosion();
            for (let k = enemiesRef.current.length - 1; k >= 0; k--) {
                const target = enemiesRef.current[k];
                const d = Math.hypot(target.pos.x - bullet.pos.x, target.pos.y - bullet.pos.y);
                if (d <= bullet.explodeRadius + target.radius) {
                    target.hp -= damageDealt;
                    spawnFloatingText(target.pos, `${damageDealt}`, '#fff', 14);
                    if (target.hp <= 0 && k !== i) {
                        processKill(target);
                        enemiesRef.current.splice(k, 1);
                        if (k < i) i--; 
                    }
                }
            }
            bulletsRef.current.splice(j, 1);
          } else {
            enemy.hp -= damageDealt;
            spawnFloatingText(enemy.pos, `${damageDealt}`, '#fff', bullet.pierce > 0 ? 12 : 14);
            createExplosion(bullet.pos, bullet.pierce > 0 ? '#d8b4fe' : '#fef08a', 3);
            if (bullet.pierce > 0) {
                bullet.pierce -= 1;
                bullet.hitIds.push(enemy.id);
                if (bullet.pierce < 0) bulletsRef.current.splice(j, 1);
            } else {
                bulletsRef.current.splice(j, 1);
            }
          }
          if (enemy.hp <= 0) {
             processKill(enemy);
             createExplosion(enemy.pos, enemy.color, 10);
             audioParams.playExplosion(); 
             enemiesRef.current.splice(i, 1);
          }
          break;
        }
      }
    }

    // Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      
      if (p.id === 'shockwave') {
          p.radius += 10; // Fast expand
          p.alpha -= 0.05;
          if (p.alpha <= 0) particlesRef.current.splice(i, 1);
      } else {
          p.pos.x += p.velocity.x;
          p.pos.y += p.velocity.y;
          p.life -= 0.04;
          p.alpha = p.life;
          if (p.life <= 0) particlesRef.current.splice(i, 1);
      }
    }

    // Floating Texts
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.pos.x += ft.velocity.x;
        ft.pos.y += ft.velocity.y;
        ft.life -= 0.02;
        if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [gameState, setGameState, setStats, setPlayerHp, setPlayerXp, setMaxXp, inputMode]);

  const checkLevelUp = () => {
      if (playerRef.current.xp >= playerRef.current.maxXp) {
        playerRef.current.xp -= playerRef.current.maxXp;
        playerRef.current.level += 1;
        const nextLevel = playerRef.current.level;
        playerRef.current.maxXp = Math.floor(XP_BASE * Math.pow(nextLevel, XP_GROWTH_EXPONENT));
        onLevelUp();
    }
  };

  const processKill = (enemy: Enemy) => {
    scoreRef.current += ENEMY_CONFIG[enemy.type].score;
    killsRef.current += 1;
    if (Math.random() < LOOT_CONFIG.dropChance) {
        const isHealth = Math.random() < LOOT_CONFIG.healthPackChance;
        spawnLoot(enemy.pos, isHealth ? LootType.HEALTH_PACK : LootType.XP_ORB);
    } else {
        playerRef.current.xp += enemy.value;
        checkLevelUp();
    }
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, difficulty: number, timeMs: number) => {
    const zoneIndex = Math.floor(difficulty);
    const theme = getZoneTheme(zoneIndex);
    const hue = (210 + (zoneIndex * 35)) % 360;
    
    ctx.fillStyle = `hsl(${hue}, 40%, 6%)`;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = theme.hasPulse ? 0.05 + Math.sin(timeMs / 500) * 0.03 : 0.08;
    ctx.strokeStyle = `hsl(${hue}, 80%, 70%)`;
    ctx.lineWidth = 1;
    
    const scroll = (timeMs / 10) * theme.speedMod;
    const gap = theme.density;

    ctx.beginPath();
    const off = scroll % gap;
    for (let x = 0; x <= w; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = off; y <= h; y += gap) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBackground(ctx, canvas.width, canvas.height, difficultyRef.current, gameTimeRef.current);

    ctx.save();
    if (shakeRef.current > 0) {
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
    }

    // Loot
    lootRef.current.forEach(item => {
        ctx.save();
        ctx.translate(item.pos.x, item.pos.y);
        const float = Math.sin(gameTimeRef.current / 300 + item.floatOffset) * 3;
        ctx.translate(0, float);
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.color;
        ctx.fillStyle = item.color;
        if (item.type === LootType.HEALTH_PACK) {
            ctx.fillRect(-4, -10, 8, 20);
            ctx.fillRect(-10, -4, 20, 8);
        } else {
            ctx.beginPath();
            ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0);
            ctx.fill();
        }
        ctx.restore();
    });

    // Player
    const p = playerRef.current;
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    
    if (p.magnetRadius > PLAYER_STATS.baseMagnetRadius) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath(); ctx.arc(0, 0, p.magnetRadius, 0, Math.PI * 2); ctx.stroke();
    }

    if (!p.autoAim) ctx.rotate(p.angle); 
    else ctx.rotate(gameTimeRef.current / 500); 
    
    ctx.shadowBlur = 15; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.stroke();

    if (p.shield > 0) {
        ctx.shadowColor = '#3b82f6';
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 + (p.shield/p.maxShield)*0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, p.radius + 5, 0, Math.PI * 2); ctx.stroke();
    }

    if (p.thornsDamage > 0) {
         const spikes = 8;
         ctx.fillStyle = '#a8a29e';
         for(let i=0; i<spikes; i++) {
             const ang = (Math.PI * 2 / spikes) * i + (gameTimeRef.current / 1000);
             ctx.beginPath();
             ctx.moveTo(Math.cos(ang) * (p.radius), Math.sin(ang) * (p.radius));
             ctx.lineTo(Math.cos(ang) * (p.radius + 8), Math.sin(ang) * (p.radius + 8));
             ctx.lineTo(Math.cos(ang + 0.2) * (p.radius), Math.sin(ang + 0.2) * (p.radius));
             ctx.fill();
         }
    }

    if (p.autoAim) {
        for(let i=0; i<3; i++) {
            const ang = (Math.PI * 2 / 3) * i + (gameTimeRef.current / 200);
            ctx.fillStyle = '#fff'; ctx.fillRect(Math.cos(ang) * 20 - 3, Math.sin(ang) * 20 - 3, 6, 6);
        }
    } else {
        ctx.fillStyle = '#fff'; ctx.fillRect(p.radius - 2, -3, 12, 6); 
    }
    ctx.restore();

    // Bullets
    bulletsRef.current.forEach(b => {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      ctx.rotate(Math.atan2(b.velocity.y, b.velocity.x));
      if (b.pierce > 0) { 
          ctx.shadowBlur = 10; ctx.shadowColor = b.color; ctx.fillStyle = '#fff';
          ctx.fillRect(-10, -2, 30, 4); ctx.strokeStyle = b.color; ctx.strokeRect(-10, -2, 30, 4);
      } else if (b.explodeRadius > 0) { 
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255, 100, 0, 0.5)'; ctx.fillRect(-15, -3, 10, 6);
      } else {
          ctx.fillStyle = b.color; ctx.shadowBlur = 5; ctx.shadowColor = b.color;
          ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });

    // Enemies
    enemiesRef.current.forEach(e => {
      ctx.save();
      ctx.translate(e.pos.x, e.pos.y);
      // Health bar
      if (e.hp < e.maxHp) {
          const barW = e.radius * 2.5;
          const hpPct = e.hp / e.maxHp;
          ctx.fillStyle = '#334155'; ctx.fillRect(-barW/2, -e.radius - 10, barW, 4);
          ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : '#ef4444'; ctx.fillRect(-barW/2, -e.radius - 10, barW * hpPct, 4);
      }
      ctx.fillStyle = e.color; ctx.shadowBlur = 10; ctx.shadowColor = e.color;
      const rot = gameTimeRef.current / 300; ctx.rotate(rot);
      ctx.beginPath();
      if (e.type === EnemyType.BASIC) {
        ctx.rect(-e.radius, -e.radius, e.radius*2, e.radius*2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-e.radius/2, -e.radius/2, e.radius, e.radius);
      } else if (e.type === EnemyType.FAST) {
        ctx.moveTo(e.radius, 0); ctx.lineTo(Math.cos(2.6) * e.radius, Math.sin(2.6) * e.radius);
        ctx.lineTo(Math.cos(3.6) * e.radius, Math.sin(3.6) * e.radius); ctx.fill();
      } else if (e.type === EnemyType.TANK) {
        for (let i = 0; i < 6; i++) { ctx.lineTo(Math.cos(i * Math.PI/3) * e.radius, Math.sin(i * Math.PI/3) * e.radius); }
        ctx.fill(); ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0,0, e.radius*0.5, 0, Math.PI*2); ctx.fill();
      } else { 
         for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? e.radius : e.radius * 0.4; ctx.lineTo(Math.cos(i * Math.PI/5) * r, Math.sin(i * Math.PI/5) * r); }
         ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    });

    // Particles
    particlesRef.current.forEach(pt => {
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      if (pt.id === 'shockwave') {
          ctx.beginPath(); ctx.arc(pt.pos.x, pt.pos.y, pt.radius, 0, Math.PI * 2); ctx.lineWidth=5; ctx.strokeStyle = pt.color; ctx.stroke();
      } else {
          ctx.beginPath(); ctx.arc(pt.pos.x, pt.pos.y, pt.radius, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    // Floating Texts
    floatingTextsRef.current.forEach(ft => {
        ctx.save(); ctx.globalAlpha = Math.max(0, ft.life); ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px "Courier New", monospace`; ctx.textAlign = 'center';
        ctx.shadowColor = 'black'; ctx.shadowBlur = 2; ctx.fillText(ft.text, ft.pos.x, ft.pos.y); ctx.restore();
    });

    // Draw Virtual Joystick (if active/touch mode)
    if (inputMode === InputMode.TOUCH && joystickRef.current.active) {
        ctx.save();
        // Base
        ctx.beginPath();
        ctx.arc(joystickRef.current.origin.x, joystickRef.current.origin.y, 50, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill(); ctx.stroke();
        // Knob
        ctx.beginPath();
        ctx.arc(joystickRef.current.current.x, joystickRef.current.current.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.5)';
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      
      if (key === ' ' && gameState === GameState.PLAYING) {
          triggerShockwave();
      }

      if (key === 'escape' || key === 'p') {
          if (gameState === GameState.PLAYING) {
              const p = playerRef.current;
              const weaponName = STARTER_WEAPONS.find(w => w.id === p.weaponId)?.name || "Unknown";
              const fireRate = 1000 / (PLAYER_STATS.baseFireRate * p.fireRateMultiplier);
              setPlayerAttributes({
                  weaponName,
                  damage: PLAYER_STATS.baseDamage * p.damageMultiplier,
                  fireRate: parseFloat(fireRate.toFixed(1)),
                  speed: p.speed,
                  maxHp: p.maxHp,
                  projectileCount: p.projectileCount,
                  piercing: p.piercing,
                  blastRadius: p.blastRadius,
                  bulletSpeed: PLAYER_STATS.baseBulletSpeed * p.bulletSpeedMultiplier,
                  upgrades: p.upgrades,
                  shield: p.shield,
                  magnet: p.magnetRadius,
                  thorns: p.thornsDamage,
                  regen: p.hpRegen
              });
              lastTimeRef.current = 0; 
              setGameState(GameState.PAUSED);
          } else if (gameState === GameState.PAUSED) {
              lastTimeRef.current = performance.now();
              setGameState(GameState.PLAYING);
          }
      }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
  const handleMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseDown = () => isMouseDownRef.current = true;
  const handleMouseUp = () => isMouseDownRef.current = false;
  
  // Touch Events
  const handleTouchStart = (e: TouchEvent) => {
      if (inputMode !== InputMode.TOUCH) return;
      e.preventDefault();
      // If joystick inactive, use first touch as joystick origin
      // Only consider touches on the left half of the screen for movement
      for (let i=0; i<e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (!joystickRef.current.active && t.clientX < window.innerWidth / 2) {
              joystickRef.current.active = true;
              joystickRef.current.touchId = t.identifier;
              joystickRef.current.origin = { x: t.clientX, y: t.clientY };
              joystickRef.current.current = { x: t.clientX, y: t.clientY };
              joystickRef.current.vector = { x: 0, y: 0 };
          }
      }
  };

  const handleTouchMove = (e: TouchEvent) => {
      if (inputMode !== InputMode.TOUCH || !joystickRef.current.active) return;
      e.preventDefault();
      for (let i=0; i<e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === joystickRef.current.touchId) {
              const maxDist = 50;
              let dx = t.clientX - joystickRef.current.origin.x;
              let dy = t.clientY - joystickRef.current.origin.y;
              const dist = Math.hypot(dx, dy);
              
              if (dist > maxDist) {
                  dx = (dx / dist) * maxDist;
                  dy = (dy / dist) * maxDist;
              }
              
              joystickRef.current.current = { 
                  x: joystickRef.current.origin.x + dx,
                  y: joystickRef.current.origin.y + dy
              };
              
              // Normalize for logic
              joystickRef.current.vector = {
                  x: dx / maxDist,
                  y: dy / maxDist
              };
          }
      }
  };

  const handleTouchEnd = (e: TouchEvent) => {
       if (inputMode !== InputMode.TOUCH || !joystickRef.current.active) return;
       e.preventDefault();
       for (let i=0; i<e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === joystickRef.current.touchId) {
              joystickRef.current.active = false;
              joystickRef.current.touchId = null;
              joystickRef.current.vector = { x: 0, y: 0 };
          }
       }
  };

  const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; } };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
    
    // Touch listeners on canvas specifically or window? Window is safer for drag out.
    // Use non-passive to prevent scroll
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    handleResize();
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update, gameState, inputMode]); 

  return <canvas ref={canvasRef} className="absolute inset-0 block" />;
});
