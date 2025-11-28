


import React, { useState, useEffect } from 'react';
import { GameState, GameStats, StarterWeapon, Upgrade, UpgradeType, PlayerAttributes, InputMode, LeaderboardEntry } from '../types';
import { analyzeBattle, generateAvatar } from '../services/geminiService';
import { UPGRADES_POOL as POOL_SOURCE, STARTER_WEAPONS, LEADERBOARD_KEY, CUSTOM_AVATAR_KEY, MAX_WEAPONS } from '../constants';

interface UIOverlayProps {
  gameState: GameState;
  inputMode: InputMode;
  stats: GameStats;
  playerHp: number;
  maxHp: number;
  playerXp: number;
  maxXp: number;
  playerAttributes: PlayerAttributes | null;
  abilityCooldown: { current: number, max: number };
  volume: number;
  setVolume: (v: number) => void;
  onDeviceSelect: (mode: InputMode) => void;
  onStartGame: (weaponId: string) => void; 
  onEnterSelection: () => void; 
  onRestart: () => void;
  onUpgradeSelect: (upgrade: Upgrade) => void;
  onResume: () => void;
  onTriggerAbility: () => void;
  onOpenLeaderboard: () => void;
  onOpenCustomize: () => void;
  onBackToMenu: () => void;
  customAvatar: string | null;
  onSaveAvatar: (b64: string) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  inputMode,
  stats,
  playerHp,
  maxHp,
  playerXp,
  maxXp,
  playerAttributes,
  abilityCooldown,
  volume,
  setVolume,
  onDeviceSelect,
  onStartGame,
  onEnterSelection,
  onRestart,
  onUpgradeSelect,
  onResume,
  onTriggerAbility,
  onOpenLeaderboard,
  onOpenCustomize,
  onBackToMenu,
  customAvatar,
  onSaveAvatar
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (gameState === GameState.LEVEL_UP) {
      let availablePool = POOL_SOURCE;
      if (playerAttributes) {
          if (playerAttributes.inventory.length >= MAX_WEAPONS) {
              availablePool = availablePool.filter(u => u.type !== UpgradeType.WEAPON_SLOT);
          }
      }
      const shuffled = [...availablePool].sort(() => 0.5 - Math.random());
      setUpgradeOptions(shuffled.slice(0, 3));
    } else if (gameState === GameState.PLAYING) {
      setAnalysis(null);
    } else if (gameState === GameState.LEADERBOARD) {
        const saved = localStorage.getItem(LEADERBOARD_KEY);
        if (saved) setLeaderboard(JSON.parse(saved));
    } else if (gameState === GameState.CUSTOMIZE) {
        setGeneratedPreview(customAvatar);
    }
  }, [gameState, customAvatar, playerAttributes]);

  useEffect(() => {
      if (gameState === GameState.GAME_OVER && stats.score > 0) {
          const entry: LeaderboardEntry = {
              date: new Date().toLocaleDateString(),
              score: stats.score,
              kills: stats.kills,
              timeAlive: stats.timeAlive,
              level: stats.playerLevel,
              weapon: playerAttributes?.weaponName || 'Unknown'
          };
          const saved = localStorage.getItem(LEADERBOARD_KEY);
          let lb: LeaderboardEntry[] = saved ? JSON.parse(saved) : [];
          lb.push(entry);
          lb.sort((a, b) => b.score - a.score);
          lb = lb.slice(0, 10); 
          localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
      }
  }, [gameState]);

  const handleAnalyze = async () => {
    setLoadingAnalysis(true);
    const result = await analyzeBattle(
        stats.timeAlive, 
        stats.kills, 
        stats.score, 
        "装甲耗尽", 
        stats.playerLevel,
        playerAttributes?.weaponName || "未知武装"
    );
    setAnalysis(result);
    setLoadingAnalysis(false);
  };

  const handleGenerateAvatar = async () => {
      if (!avatarPrompt) return;
      setIsGenerating(true);
      try {
          const base64 = await generateAvatar(avatarPrompt);
          if (base64) setGeneratedPreview(base64);
          else alert("生成失败");
      } catch (e) {
          alert("生成失败，请稍后再试");
      } finally {
          setIsGenerating(false);
      }
  };

  const saveAvatar = () => {
      if (generatedPreview) {
          onSaveAvatar(generatedPreview);
          onBackToMenu();
      }
  };
  
  const handleSwitchClick = () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'q' }));
  };

  const renderSettings = () => (
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center bg-slate-900/80 backdrop-blur p-2 rounded border border-slate-700">
            <span className="text-xs text-slate-400 mr-2 uppercase font-bold">音量</span>
            <input 
                type="range" 
                min="0" max="1" step="0.1" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-cyan-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
      </div>
  );

  const renderUpgradeGrid = (attrs: PlayerAttributes) => {
      const entries = Object.entries(attrs.upgrades);
      if (entries.length === 0) return <div className="text-slate-500 text-xs italic">暂无增强模块</div>;

      return (
          <div className="grid grid-cols-4 gap-2">
              {entries.map(([key, count]) => {
                  const upgrade = POOL_SOURCE.find(u => u.type === key);
                  if (!upgrade) return null;
                  return (
                      <div key={key} className="group relative bg-slate-900 p-2 rounded border border-slate-700 flex flex-col items-center justify-center">
                          <div className="text-[10px] text-slate-400 uppercase">{upgrade.name}</div>
                          <div className="text-lg font-bold text-cyan-400">x{count}</div>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-black border border-slate-600 p-2 rounded hidden group-hover:block z-50">
                              <p className="text-[10px] text-slate-300 leading-tight">{upgrade.description}</p>
                          </div>
                      </div>
                  )
              })}
          </div>
      );
  };

  const renderSpecialModules = (attrs: PlayerAttributes) => {
    const modules = [];
    if (attrs.isShotgun) modules.push({ name: "暴乱镇压", color: "text-orange-400" });
    if (attrs.isSniper) modules.push({ name: "高斯狙击", color: "text-purple-400" });
    if (attrs.isOverload) modules.push({ name: "超载火炮", color: "text-red-500" });
    if (attrs.isHoming) modules.push({ name: "智能追踪", color: "text-green-400" });
    if (attrs.isIncendiary) modules.push({ name: "地狱火", color: "text-red-500" });
    if (attrs.isGiantSaber) modules.push({ name: "泰坦斩击", color: "text-pink-500" });
    if (attrs.isNovaOrbs) modules.push({ name: "超新星", color: "text-cyan-400" });
    if (attrs.isQuantumStorm) modules.push({ name: "量子风暴", color: "text-blue-400" });
    if (attrs.upgrades[UpgradeType.STATIC_FIELD]) modules.push({ name: `静电场 Lv.${attrs.upgrades[UpgradeType.STATIC_FIELD]}`, color: "text-blue-300" });
    if (attrs.upgrades[UpgradeType.DRONE_SUPPORT]) modules.push({ name: `无人机 x${attrs.upgrades[UpgradeType.DRONE_SUPPORT]}`, color: "text-yellow-300" });

    if (modules.length === 0) return <div className="text-slate-500 text-xs italic">暂无特殊模组</div>;
    
    return (
        <div className="flex flex-wrap gap-2">
            {modules.map((m, i) => (
                <span key={i} className={`px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold uppercase ${m.color}`}>
                    {m.name}
                </span>
            ))}
        </div>
    );
  };

  // --- Device Select ---
  if (gameState === GameState.DEVICE_SELECT) {
      return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50 font-sans">
        <div className="text-center space-y-12 relative z-20">
           <h1 className="text-4xl font-black text-white tracking-widest uppercase mb-8">选择操作模式</h1>
           <div className="flex gap-8 justify-center flex-wrap p-4">
               <button 
                onClick={() => onDeviceSelect(InputMode.MOUSE_KB)}
                className="group flex flex-col items-center gap-4 p-8 bg-slate-800/50 border-2 border-slate-600 hover:border-cyan-500 rounded-2xl w-64"
               >
                   <div className="text-6xl mb-2">🖱️</div>
                   <div className="text-xl font-bold text-white">电脑 PC</div>
                   <div className="text-sm text-slate-400">WASD 移动 + Q键切枪</div>
               </button>

               <button 
                onClick={() => onDeviceSelect(InputMode.TOUCH)}
                className="group flex flex-col items-center gap-4 p-8 bg-slate-800/50 border-2 border-slate-600 hover:border-purple-500 rounded-2xl w-64"
               >
                   <div className="text-6xl mb-2">📱</div>
                   <div className="text-xl font-bold text-white">手机 / 平板</div>
                   <div className="text-sm text-slate-400">摇杆移动 + 按钮切枪</div>
               </button>
           </div>
        </div>
      </div>
      );
  }

  // --- Menu ---
  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-50 backdrop-blur-sm font-sans">
        {renderSettings()}
        <div className="text-center space-y-8 p-12 border-2 border-cyan-500/50 rounded-xl bg-slate-800/90 relative z-20 max-w-2xl w-[90%]">
          <div className="space-y-2">
            <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tighter drop-shadow-lg">
              无限赛博生存
            </h1>
            <p className="text-cyan-300/70 font-mono tracking-widest text-sm">INFINITE CYBER-SURVIVAL // v4.0_WORLD</p>
          </div>
          
          <div className="flex justify-center my-4">
              <div className="w-24 h-24 rounded-full border-2 border-cyan-500 p-1 bg-black relative group cursor-pointer" onClick={onOpenCustomize}>
                  {customAvatar ? (
                      <img src={customAvatar} className="w-full h-full rounded-full object-cover" alt="avatar" />
                  ) : (
                      <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-4xl">🤖</div>
                  )}
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white font-bold">编辑</span>
                  </div>
              </div>
          </div>

          <div className="flex flex-col gap-4 w-64 mx-auto">
              <button
                onClick={onEnterSelection}
                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded shadow-[0_0_20px_rgba(6,182,212,0.5)]"
              >
                开始任务
              </button>
              <button onClick={onOpenLeaderboard} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded">
                  英灵殿 (排行榜)
              </button>
              <button onClick={() => onDeviceSelect(InputMode.MOUSE_KB)} className="text-xs text-slate-500 hover:text-cyan-400 mt-4">
                  &lt; 切换操作模式 &gt;
              </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Weapon Select ---
  if (gameState === GameState.WEAPON_SELECT) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 z-50 backdrop-blur font-sans">
        <div className="w-full max-w-6xl px-8 relative z-20 overflow-y-auto max-h-screen py-8">
          <div className="flex items-center mb-8">
              <button onClick={onBackToMenu} className="text-slate-400 hover:text-white mr-4 font-mono"> &lt; 返回</button>
              <h2 className="text-4xl font-black text-white tracking-wider">选择你的初始武装</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STARTER_WEAPONS.map((weapon) => (
              <button
                key={weapon.id}
                onClick={() => onStartGame(weapon.id)}
                className="group relative flex flex-col bg-slate-800/50 border-2 border-slate-600 hover:border-cyan-500 rounded-xl p-6 text-left transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
              >
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-400">{weapon.name}</h3>
                <div className="w-full h-px bg-slate-700 my-3" />
                <p className="text-sm text-slate-400 mb-4 flex-grow leading-relaxed">{weapon.description}</p>
                <div className="space-y-2 text-xs text-slate-500 font-mono">
                  <div className="flex justify-between">
                      <span>伤害系数</span>
                      <span className="text-white">x{weapon.stats.damageMultiplier || 1}</span>
                  </div>
                  <div className="flex justify-between">
                      <span>类型</span>
                      <span className="text-cyan-300 uppercase">{weapon.type || 'RANGED'}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Playing HUD ---
  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute inset-0 pointer-events-none font-sans text-white">
        {renderSettings()}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start bg-gradient-to-b from-slate-900/80 to-transparent">
          <div className="flex flex-col gap-2">
            {/* Bars */}
            <div className="flex flex-col gap-1 w-64">
                {/* HP Bar */}
                <div className="relative w-full h-6 bg-slate-800 border border-slate-600 rounded overflow-hidden skew-x-[-10deg]">
                    <div className="h-full bg-red-600" style={{ width: `${Math.max(0, (playerHp / maxHp) * 100)}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow z-10">HP {Math.ceil(playerHp)} / {Math.ceil(maxHp)}</span>
                </div>

                {/* Shield Bar - Separate */}
                {playerAttributes && playerAttributes.maxHp && (
                    <div className="relative w-full h-3 bg-slate-900/50 border border-slate-700 rounded overflow-hidden skew-x-[-10deg]">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (playerAttributes.shield / (playerAttributes.maxHp)) * 100)}%` }} /> 
                        {/* Note: Using maxHp as base for shield visualization width ratio roughly */}
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold drop-shadow text-blue-200 leading-none">SHIELD {Math.ceil(playerAttributes.shield)}</span>
                    </div>
                )}
            </div>

            {/* XP Bar */}
            <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-yellow-400" style={{ width: `${Math.min(100, (playerXp / maxXp) * 100)}%` }} />
            </div>
            
            <div className="flex items-center gap-4 mt-2">
                 <div className="text-xs text-yellow-400 font-bold">LV. {stats.playerLevel}</div>
                 {playerAttributes && (
                     <div className="flex gap-1">
                         {playerAttributes.inventory.map((wId, idx) => {
                             const w = STARTER_WEAPONS.find(sw => sw.id === wId);
                             const isActive = idx === playerAttributes.activeWeaponIndex;
                             return (
                                 <div key={idx} className={`px-2 py-1 rounded text-[10px] font-bold border uppercase ${isActive ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                                     {w?.name.substring(0, 2)}
                                 </div>
                             )
                         })}
                     </div>
                 )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-4xl font-black tracking-tighter">{stats.score.toLocaleString()}</div>
            <div className="text-sm text-cyan-400 font-mono tracking-widest">{stats.timeAlive.toFixed(1)}s</div>
          </div>
        </div>

        {/* PC Ability Indicator (Bottom Center) */}
        {inputMode === InputMode.MOUSE_KB && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
              <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all ${
                  abilityCooldown.current <= 0 ? 'border-cyan-400 bg-cyan-900/50 shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-110' : 'border-slate-600 bg-slate-900/80'
              }`}> 
                  {/* Cooldown Overlay */}
                  {abilityCooldown.current > 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-xs font-bold">{Math.ceil(abilityCooldown.current)}</span>
                      </div>
                  )}
                  {/* Circular Progress */}
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                      <path
                          className="text-cyan-500"
                          strokeDasharray={`${(1 - (abilityCooldown.current / abilityCooldown.max)) * 100}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                      />
                  </svg>
                  <span className="text-2xl">⚡</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  SPACE
              </span>
          </div>
        )}

        {/* Mobile Touch Controls */}
        {inputMode === InputMode.TOUCH && (
            <div className="absolute bottom-8 right-8 pointer-events-auto z-50 flex flex-col gap-4">
                {playerAttributes && playerAttributes.inventory.length > 1 && (
                    <button onClick={handleSwitchClick} className="w-16 h-16 rounded-full bg-yellow-600/80 text-white border-2 border-yellow-500 flex flex-col items-center justify-center shadow-lg">
                        <span className="text-[10px] font-bold">SWITCH</span>
                    </button>
                )}
                <button onClick={onTriggerAbility} className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center ${abilityCooldown.current > 0 ? 'bg-slate-800/50 border-slate-600' : 'bg-cyan-600/80 border-cyan-500'}`}>
                    {abilityCooldown.current > 0 && (
                         <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                             <span className="text-xl font-bold">{Math.ceil(abilityCooldown.current)}</span>
                         </div>
                    )}
                    <span className="text-xl font-black">BLAST</span>
                </button>
            </div>
        )}
      </div>
    );
  }

  // --- Pause ---
  if (gameState === GameState.PAUSED) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-50 backdrop-blur font-sans">
              <div className="bg-slate-800 p-8 rounded-xl border border-slate-600 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-3xl font-bold text-white mb-6 text-center">PAUSED</h2>
                  
                  {playerAttributes && (
                      <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-8">
                              <div>
                                  <h3 className="text-cyan-400 font-bold mb-2 border-b border-slate-700 pb-1">当前状态</h3>
                                  <div className="text-sm space-y-1 text-slate-300">
                                      <div className="flex justify-between"><span>武器</span><span className="text-white">{playerAttributes.weaponName}</span></div>
                                      <div className="flex justify-between"><span>伤害</span><span className="text-white">{Math.round(playerAttributes.damage)}</span></div>
                                      <div className="flex justify-between"><span>攻速</span><span className="text-white">{(playerAttributes.fireRate)}/s</span></div>
                                      <div className="flex justify-between"><span>生命</span><span className="text-white">{Math.round(playerAttributes.maxHp)}</span></div>
                                      <div className="flex justify-between"><span>护盾</span><span className="text-white">{Math.round(playerAttributes.shield)}</span></div>
                                      <div className="flex justify-between"><span>范围</span><span className="text-white">x{playerAttributes.area}</span></div>
                                  </div>
                              </div>
                              <div>
                                  <h3 className="text-yellow-400 font-bold mb-2 border-b border-slate-700 pb-1">特殊模组</h3>
                                  {renderSpecialModules(playerAttributes)}
                              </div>
                          </div>
                          <div>
                              <h3 className="text-slate-300 font-bold mb-2 border-b border-slate-700 pb-1">已安装升级</h3>
                              {renderUpgradeGrid(playerAttributes)}
                          </div>
                      </div>
                  )}

                  <div className="flex flex-col gap-3 mt-8">
                      <button onClick={onResume} className="w-full py-3 bg-cyan-600 text-white font-bold rounded hover:bg-cyan-500">继续战斗</button>
                      <button onClick={onRestart} className="w-full py-3 bg-slate-700 text-white font-bold rounded hover:bg-slate-600">放弃任务 (重开)</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- Level Up / Game Over / Customization ---
  if (gameState === GameState.LEVEL_UP) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-50 backdrop-blur-sm font-sans">
        <div className="w-full max-w-4xl p-8 relative z-20">
          <h2 className="text-5xl font-black text-yellow-400 text-center mb-2">LEVEL UP</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {upgradeOptions.map((upgrade, idx) => (
              <button
                key={idx}
                onClick={() => onUpgradeSelect(upgrade)}
                className={`group relative flex flex-col bg-slate-800 border-2 rounded-xl p-6 text-left transition-all hover:-translate-y-2 ${upgrade.rarity === 'LEGENDARY' ? 'border-yellow-500' : 'border-slate-600 hover:border-white'}`}
              >
                <div className="text-xs font-bold mb-2 uppercase tracking-wider opacity-70" 
                     style={{color: upgrade.rarity === 'LEGENDARY' ? '#eab308' : upgrade.rarity === 'EPIC' ? '#a855f7' : upgrade.rarity === 'RARE' ? '#3b82f6' : '#94a3b8'}}>
                  {upgrade.rarity}
                </div>
                <h3 className="text-2xl font-black text-white mb-4 group-hover:text-yellow-300">{upgrade.name}</h3>
                <p className="text-slate-400 text-sm">{upgrade.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-red-950/90 z-50 backdrop-blur font-sans">
        <div className="text-center space-y-8 relative z-20 max-w-lg w-full p-8">
          <h2 className="text-6xl font-black text-red-500 mb-2 animate-pulse">MISSION FAILED</h2>
          <div className="bg-black/40 border border-red-900/50 p-6 rounded-lg backdrop-blur-md">
            <div className="grid grid-cols-2 gap-4 text-lg font-mono">
              <div className="text-slate-400 text-left">TIME</div>
              <div className="text-white text-right font-bold">{stats.timeAlive.toFixed(2)}s</div>
              <div className="text-slate-400 text-left">KILLS</div>
              <div className="text-white text-right font-bold">{stats.kills}</div>
              <div className="text-slate-400 text-left">SCORE</div>
              <div className="text-yellow-400 text-right font-bold">{stats.score.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="bg-slate-900/80 border border-cyan-900 p-6 rounded-lg min-h-[150px] flex flex-col justify-center relative overflow-hidden">
            {!analysis ? (
              <button onClick={handleAnalyze} disabled={loadingAnalysis} className="px-6 py-2 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/30 text-cyan-400 rounded text-sm font-bold mx-auto">
                  {loadingAnalysis ? 'ANALYZING...' : 'REQUEST TACTICAL ANALYSIS'}
              </button>
            ) : (
              <p className="text-slate-300 text-sm leading-relaxed font-mono whitespace-pre-wrap text-left">{analysis}</p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={onRestart} className="flex-1 py-4 bg-white text-black font-black text-xl rounded hover:scale-105 transition-transform">REBOOT</button>
            <button onClick={onBackToMenu} className="px-6 py-4 bg-slate-800 text-slate-300 font-bold rounded">MENU</button>
          </div>
        </div>
      </div>
    );
  }
  
  // Customize
  if (gameState === GameState.CUSTOMIZE) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 z-50 backdrop-blur font-sans">
              <div className="w-full max-w-2xl p-8 bg-slate-800 border-2 border-cyan-500/50 rounded-xl shadow-2xl relative z-20">
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-3xl font-black text-cyan-400 tracking-wider">AVATAR GENERATION</h2>
                      <button onClick={onBackToMenu} className="text-slate-400 hover:text-white text-2xl">×</button>
                  </div>
                  <div className="flex gap-8 flex-col md:flex-row">
                      <div className="flex-1 space-y-6">
                          <textarea 
                            value={avatarPrompt}
                            onChange={(e) => setAvatarPrompt(e.target.value)}
                            placeholder="Describe your avatar..."
                            className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-4 text-white focus:border-cyan-500 outline-none resize-none"
                          />
                          <button onClick={handleGenerateAvatar} disabled={isGenerating || !avatarPrompt} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded">
                              {isGenerating ? 'GENERATING...' : 'GENERATE'}
                          </button>
                      </div>
                      <div className="w-full md:w-64 flex flex-col items-center gap-4">
                          <div className="w-48 h-48 bg-black border-2 border-dashed border-slate-600 rounded flex items-center justify-center overflow-hidden">
                              {generatedPreview ? <img src={generatedPreview} className="w-full h-full object-cover" /> : <span className="text-slate-600">PREVIEW</span>}
                          </div>
                          <button onClick={saveAvatar} disabled={!generatedPreview} className="w-48 py-2 bg-green-600 text-white font-bold rounded disabled:bg-slate-700">SAVE & EQUIP</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }
  
  if (gameState === GameState.LEADERBOARD) {
       return (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 z-50 backdrop-blur font-sans">
              <div className="w-full max-w-3xl p-8 bg-slate-800 border-2 border-purple-500/50 rounded-xl shadow-2xl relative z-20">
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-4xl font-black text-purple-400 tracking-wider">HALL OF FAME</h2>
                      <button onClick={onBackToMenu} className="text-slate-400 hover:text-white text-2xl">×</button>
                  </div>
                  <div className="space-y-2">
                      {leaderboard.map((entry, idx) => (
                          <div key={idx} className="grid grid-cols-5 items-center bg-slate-900/50 p-4 rounded border border-slate-700">
                                  <div className="font-black text-xl text-slate-600">#{idx + 1}</div>
                                  <div className="text-cyan-400 font-mono font-bold">{entry.score.toLocaleString()}</div>
                                  <div className="text-slate-300">{entry.kills} Kills</div>
                                  <div className="text-slate-400">{entry.timeAlive.toFixed(1)}s</div>
                                  <div className="text-right text-xs text-purple-300">{entry.weapon}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
       );
  }

  return null;
};
