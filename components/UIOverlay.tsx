
import React, { useState, useEffect } from 'react';
import { GameState, GameStats, StarterWeapon, Upgrade, UpgradeType, PlayerAttributes, InputMode } from '../types';
import { analyzeBattle } from '../services/geminiService';
import { UPGRADES_POOL as POOL_SOURCE, STARTER_WEAPONS } from '../constants';

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
  onTriggerAbility
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);

  useEffect(() => {
    if (gameState === GameState.LEVEL_UP) {
      const shuffled = [...POOL_SOURCE].sort(() => 0.5 - Math.random());
      setUpgradeOptions(shuffled.slice(0, 3));
    } else if (gameState === GameState.PLAYING) {
      setAnalysis(null);
    }
  }, [gameState]);

  const handleAnalyze = async () => {
    setLoadingAnalysis(true);
    const result = await analyzeBattle(stats.timeAlive, stats.kills, stats.score, "装甲耗尽");
    setAnalysis(result);
    setLoadingAnalysis(false);
  };

  const Scanlines = () => (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-10">
      <div className="w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
    </div>
  );

  // --- Settings/Volume UI ---
  const renderSettings = () => (
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center bg-slate-900/80 backdrop-blur p-2 rounded border border-slate-700">
            <span className="text-xs text-slate-400 mr-2 uppercase font-bold">Audio</span>
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

  // --- Device Select ---
  if (gameState === GameState.DEVICE_SELECT) {
      return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50 font-sans">
        <Scanlines />
        <div className="text-center space-y-12 relative z-20">
           <h1 className="text-4xl font-black text-white tracking-widest uppercase mb-8">Select Control Mode</h1>
           <div className="flex gap-8 justify-center">
               <button 
                onClick={() => onDeviceSelect(InputMode.MOUSE_KB)}
                className="group flex flex-col items-center gap-4 p-8 bg-slate-800/50 border-2 border-slate-600 hover:border-cyan-500 hover:bg-slate-800 rounded-2xl transition-all w-64"
               >
                   <div className="text-6xl mb-2">🖱️</div>
                   <div className="text-xl font-bold text-white group-hover:text-cyan-400">PC / Desktop</div>
                   <div className="text-sm text-slate-400">WASD Move + Mouse Aim</div>
               </button>

               <button 
                onClick={() => onDeviceSelect(InputMode.TOUCH)}
                className="group flex flex-col items-center gap-4 p-8 bg-slate-800/50 border-2 border-slate-600 hover:border-purple-500 hover:bg-slate-800 rounded-2xl transition-all w-64"
               >
                   <div className="text-6xl mb-2">📱</div>
                   <div className="text-xl font-bold text-white group-hover:text-purple-400">Mobile / Tablet</div>
                   <div className="text-sm text-slate-400">Joystick Move + Auto Fire</div>
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
        <Scanlines />
        {renderSettings()}
        <div className="text-center space-y-8 p-12 border-2 border-cyan-500/50 rounded-xl bg-slate-800/90 shadow-[0_0_100px_rgba(34,211,238,0.2)] relative z-20 max-w-2xl animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tighter drop-shadow-lg">
              无限赛博生存
            </h1>
            <p className="text-cyan-300/70 font-mono tracking-widest text-sm">INFINITE CYBER-SURVIVAL // v2.5_MOBILE</p>
          </div>
          <p className="text-slate-300 text-lg max-w-lg mx-auto leading-relaxed">
            收集 <span className="text-yellow-400">XP晶体</span> 升级，寻找 <span className="text-red-400">急救包</span> 维生。<br/>
            {inputMode === InputMode.TOUCH ? (
                <span className="text-purple-400 font-bold mt-2 block">已启用移动端辅助：自动瞄准 + 自动射击</span>
            ) : (
                <span className="text-cyan-400 font-bold mt-2 block">警报：检测到精英生物反应。</span>
            )}
          </p>
          <button
            onClick={onEnterSelection}
            className="group relative px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-2xl rounded transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)] overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">启动系统</span>
          </button>
        </div>
      </div>
    );
  }

  // --- Pause Menu ---
  if (gameState === GameState.PAUSED) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm font-sans">
        <Scanlines />
        <div className="w-full max-w-4xl p-8 relative z-20 bg-slate-900/95 border border-cyan-500/30 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-8 text-center border-b border-slate-700 pb-4">系统暂停 (SYSTEM PAUSED)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
             {/* Stats Column 1 */}
             <div className="space-y-4">
                 <h3 className="text-cyan-400 font-mono text-sm font-bold uppercase mb-2">武器参数 (WEAPONRY)</h3>
                 <div className="bg-slate-800/50 p-4 rounded border border-slate-700 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-slate-500 text-xs uppercase">当前武器</div>
                        <div className="text-white font-bold">{playerAttributes?.weaponName || "Unknown"}</div>
                    </div>
                     <div>
                        <div className="text-slate-500 text-xs uppercase">单发伤害</div>
                        <div className="text-white font-bold">{playerAttributes?.damage.toFixed(0)}</div>
                    </div>
                     <div>
                        <div className="text-slate-500 text-xs uppercase">攻击频率</div>
                        <div className="text-white font-bold">{playerAttributes?.fireRate} shots/s</div>
                    </div>
                     <div>
                        <div className="text-slate-500 text-xs uppercase">发射数量</div>
                        <div className="text-white font-bold">x{playerAttributes?.projectileCount}</div>
                    </div>
                     <div>
                        <div className="text-slate-500 text-xs uppercase">穿透数</div>
                        <div className="text-purple-400 font-bold">{playerAttributes?.piercing || 0}</div>
                    </div>
                     <div>
                        <div className="text-slate-500 text-xs uppercase">爆炸范围</div>
                        <div className="text-orange-400 font-bold">{playerAttributes?.blastRadius || 0} px</div>
                    </div>
                 </div>
             </div>

             {/* Stats Column 2 */}
             <div className="space-y-4">
                 <h3 className="text-green-400 font-mono text-sm font-bold uppercase mb-2">机体性能 (CHASSIS)</h3>
                 <div className="bg-slate-800/50 p-4 rounded border border-slate-700 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-slate-500 text-xs uppercase">装甲 / 护盾</div>
                        <div className="text-white font-bold">
                          <span className="text-red-400">{Math.round(playerHp)}</span> 
                          <span className="text-slate-500 mx-1">/</span> 
                          <span className="text-cyan-400">{playerAttributes?.shield ? Math.round(playerAttributes.shield) : 0}</span>
                        </div>
                    </div>
                     <div>
                        <div className="text-slate-500 text-xs uppercase">移动速度</div>
                        <div className="text-white font-bold">{playerAttributes?.speed.toFixed(1)}</div>
                    </div>
                     <div>
                        <div className="text-slate-500 text-xs uppercase">拾取范围</div>
                        <div className="text-yellow-400 font-bold">{playerAttributes?.magnet.toFixed(0)} px</div>
                    </div>
                     <div>
                        <div className="text-slate-500 text-xs uppercase">反伤 / 再生</div>
                        <div className="text-gray-400 font-bold">
                          {playerAttributes?.thorns} <span className="text-slate-600">|</span> {playerAttributes?.regen}/s
                        </div>
                    </div>
                 </div>
             </div>
          </div>

          <div className="text-center">
              <button 
                onClick={onResume}
                className="px-12 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg rounded transition-colors shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                  恢复同步 (RESUME)
              </button>
              <p className="mt-4 text-slate-500 text-xs font-mono">Press ESC to Resume</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Weapon Selection ---
  if (gameState === GameState.WEAPON_SELECT) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 z-50 backdrop-blur-md font-sans">
        <Scanlines />
        {renderSettings()}
        <div className="w-full max-w-7xl p-8 relative z-20 overflow-y-auto max-h-screen">
          <div className="text-center mb-8">
             <h2 className="text-4xl font-black text-white tracking-widest uppercase mb-2">选择初始挂载武装</h2>
             <p className="text-slate-400 font-mono">SELECT PRIMARY WEAPON SYSTEM</p>
             {inputMode === InputMode.TOUCH && (
                 <div className="bg-purple-900/50 text-purple-300 px-4 py-2 rounded inline-block mt-2 text-sm border border-purple-500/50">
                     ⚠️ 移动端模式：所有武器强制开启自动瞄准与自动射击
                 </div>
             )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-12">
            {STARTER_WEAPONS.map((weapon) => (
              <button
                key={weapon.id}
                onClick={() => onStartGame(weapon.id)}
                className="group relative flex flex-col h-full p-1 rounded-xl transition-all duration-300 hover:-translate-y-2 focus:outline-none"
              >
                <div 
                  className="absolute inset-0 rounded-xl opacity-50 transition-all group-hover:opacity-100 group-hover:blur-md"
                  style={{ backgroundColor: weapon.color }}
                />
                <div className="relative flex flex-col h-full bg-slate-900 rounded-lg p-6 border border-slate-700 group-hover:border-white/50 overflow-hidden">
                   <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ backgroundColor: weapon.color }} />
                   <h3 className="text-xl font-bold text-white mb-2 group-hover:scale-105 transition-transform origin-left" style={{ color: weapon.color }}>{weapon.name}</h3>
                   <p className="text-slate-400 text-sm leading-relaxed mb-4 flex-grow text-left">{weapon.description}</p>
                   <div className="space-y-1 text-xs font-mono text-slate-500 text-left">
                     {(weapon.autoAim || inputMode === InputMode.TOUCH) && <div className="text-cyan-400">[AUTO] 自动瞄准</div>}
                     {weapon.stats.damageMultiplier && weapon.stats.damageMultiplier > 1 && <div className="text-green-400">+ 伤害强化</div>}
                     {weapon.stats.fireRateMultiplier && weapon.stats.fireRateMultiplier < 1 && <div className="text-yellow-400">+ 射速强化</div>}
                     {weapon.stats.blastRadius && <div className="text-orange-400">+ 范围爆炸</div>}
                     {weapon.stats.piercing && <div className="text-purple-400">+ 穿透效果</div>}
                   </div>
                   <div className="mt-4 pt-4 border-t border-slate-800 text-center text-white/50 group-hover:text-white transition-colors font-bold text-xs uppercase tracking-widest">
                     确认装备
                   </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Level Up ---
  if (gameState === GameState.LEVEL_UP) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-md">
        <Scanlines />
        <div className="w-full max-w-5xl p-8 text-center relative z-20">
          <h2 className="text-5xl font-black text-yellow-400 tracking-wider mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">机甲升级就绪</h2>
          <p className="text-yellow-200/60 font-mono mb-12">SYSTEM UPGRADE AVAILABLE // SELECT MODULE</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upgradeOptions.map((upgrade, idx) => (
              <button
                key={idx}
                onClick={() => onUpgradeSelect(upgrade)}
                className={`
                  group relative p-8 rounded-xl border-2 text-left transition-all duration-200 hover:-translate-y-2
                  ${upgrade.rarity === 'LEGENDARY' ? 'bg-purple-900/40 border-purple-500 hover:shadow-[0_0_50px_rgba(168,85,247,0.4)]' : 
                    upgrade.rarity === 'EPIC' ? 'bg-red-900/40 border-red-500 hover:shadow-[0_0_50px_rgba(239,68,68,0.4)]' :
                    upgrade.rarity === 'RARE' ? 'bg-blue-900/40 border-blue-500 hover:shadow-[0_0_50px_rgba(59,130,246,0.4)]' :
                    'bg-slate-800/80 border-slate-600 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]'}
                `}
              >
                <div className="text-xs font-mono opacity-50 mb-2 uppercase tracking-widest">{upgrade.rarity} MODULE</div>
                <div className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">{upgrade.name}</div>
                <div className="text-slate-300 leading-relaxed">{upgrade.description}</div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 text-sm font-bold flex items-center">安装模块 &rarr;</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Game Over ---
  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-red-950/90 z-50 backdrop-blur-md font-sans">
        <Scanlines />
        <div className="w-full max-w-3xl p-8 border border-red-500/50 rounded-xl bg-slate-900/95 shadow-[0_0_100px_rgba(239,68,68,0.4)] relative z-20 flex flex-col gap-6 overflow-y-auto max-h-screen">
          <div className="text-center border-b border-red-900/50 pb-6">
            <h2 className="text-7xl font-black text-red-500 tracking-widest uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">连接中断</h2>
            <p className="text-red-400/60 font-mono text-lg mt-2">SIGNAL LOST // MISSION FAILED</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-slate-800/80 p-4 rounded border border-slate-700 text-center">
               <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">生存时间</div>
               <div className="text-2xl font-mono text-white">{Math.floor(stats.timeAlive / 60)}:{(stats.timeAlive % 60).toFixed(0).padStart(2, '0')}</div>
             </div>
             <div className="bg-slate-800/80 p-4 rounded border border-slate-700 text-center">
               <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">战斗得分</div>
               <div className="text-2xl font-mono text-yellow-400">{stats.score}</div>
             </div>
             <div className="bg-slate-800/80 p-4 rounded border border-slate-700 text-center">
               <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">击杀总数</div>
               <div className="text-2xl font-mono text-red-400">{stats.kills}</div>
             </div>
             <div className="bg-slate-800/80 p-4 rounded border border-slate-700 text-center">
               <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">最终等级</div>
               <div className="text-2xl font-mono text-purple-400">{stats.playerLevel}</div>
             </div>
          </div>

          {analysis ? (
            <div className="bg-slate-800/50 p-6 rounded text-left border-l-4 border-cyan-500 animate-fade-in">
               <p className="text-cyan-400 text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                 <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"/> AI 教官评估报告
               </p>
               <p className="text-slate-200 text-md italic leading-relaxed tracking-wide">"{analysis}"</p>
            </div>
          ) : (
            <button 
              onClick={handleAnalyze} 
              disabled={loadingAnalysis} 
              className="py-4 border border-dashed border-slate-600 rounded text-slate-400 hover:text-cyan-400 hover:border-cyan-500 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2"
            >
              {loadingAnalysis ? (
                  <span className="animate-pulse">正在下载战术评估数据...</span>
              ) : (
                  <>
                    <span className="text-lg">📥</span> 请求 AI 战术分析
                  </>
              )}
            </button>
          )}
          
          <button onClick={onRestart} className="w-full py-5 bg-white hover:bg-slate-200 text-black font-black text-xl rounded uppercase tracking-[0.2em] transition-colors shadow-lg hover:scale-[1.01] active:scale-[0.99] transform duration-100 mt-2">
            重启系统 (Reboot)
          </button>
        </div>
      </div>
    );
  }

  // --- HUD ---
  return (
    <div className="absolute inset-0 pointer-events-none font-sans select-none">
      {renderSettings()}
      
      {/* Top HUD - Stats */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pt-4 md:pt-6 pb-12 z-40">
        <div>
          <div className="text-[10px] text-slate-400 font-bold tracking-widest mb-1">得分</div>
          <div className="text-2xl md:text-4xl font-mono text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">{stats.score.toLocaleString()}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-xl md:text-3xl font-mono text-cyan-400 font-bold drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] bg-slate-900/80 px-4 md:px-6 py-2 rounded-b-xl border-x border-b border-cyan-900/50">
            {Math.floor(stats.timeAlive / 60)}:{(stats.timeAlive % 60).toFixed(0).padStart(2, '0')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-bold tracking-widest mb-1">击杀</div>
          <div className="text-2xl md:text-4xl font-mono text-red-400 drop-shadow-[0_2px_10px_rgba(248,113,113,0.3)]">{stats.kills}</div>
        </div>
      </div>

      {/* Left Side Stats Panel (Hidden on Mobile to save space) */}
      <div className="absolute left-4 top-1/3 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3 max-w-[180px] hidden lg:block pointer-events-auto">
        <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">机体状态</h3>
        <div className="space-y-2 text-xs font-mono">
           <div className="flex justify-between text-slate-300"><span>LVL</span> <span className="text-purple-400">{stats.playerLevel}</span></div>
           <div className="flex justify-between text-slate-300"><span>ATK PWR</span> <span className="text-red-400">{((1 + (stats.playerLevel * 0.1)) * 100).toFixed(0)}%</span></div> 
           {playerAttributes?.shield ? (
               <div className="flex justify-between text-slate-300"><span>SHIELD</span> <span className="text-cyan-400">{Math.round(playerAttributes.shield)}</span></div> 
           ) : null}
        </div>
      </div>

      {/* Touch Controls / Ability Button */}
      {inputMode === InputMode.TOUCH && (
          <div className="absolute bottom-24 right-6 pointer-events-auto">
              <button
                  onClick={onTriggerAbility}
                  disabled={abilityCooldown.current > 0}
                  className={`
                      w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-lg transition-all active:scale-90
                      ${abilityCooldown.current > 0 
                          ? 'border-slate-600 bg-slate-800/80' 
                          : 'border-cyan-400 bg-cyan-600/80 shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse'}
                  `}
              >
                  {abilityCooldown.current > 0 ? (
                      <span className="text-white font-bold text-lg">{Math.ceil(abilityCooldown.current)}</span>
                  ) : (
                      <span className="text-white font-bold text-xs uppercase">EMP</span>
                  )}
                  {/* Circular progress indicator */}
                   {abilityCooldown.current > 0 && (
                       <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                           <circle 
                               cx="50%" cy="50%" r="36" 
                               fill="transparent" stroke="white" strokeWidth="4" strokeOpacity="0.2" 
                           />
                           <circle 
                               cx="50%" cy="50%" r="36" 
                               fill="transparent" stroke="#22d3ee" strokeWidth="4" 
                               strokeDasharray={226}
                               strokeDashoffset={226 - (226 * (1 - abilityCooldown.current / abilityCooldown.max))}
                           />
                       </svg>
                   )}
              </button>
          </div>
      )}

      {/* PC Controls Hint */}
      {inputMode === InputMode.MOUSE_KB && abilityCooldown.current <= 0 && (
           <div className="absolute bottom-32 right-1/2 translate-x-1/2 md:right-12 md:translate-x-0 text-center animate-bounce pointer-events-none opacity-70">
               <span className="text-xs text-cyan-400 font-bold bg-slate-900/80 px-2 py-1 rounded border border-cyan-500/50">PRESS SPACE FOR EMP</span>
           </div>
      )}

      {/* Bottom Status Bars */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {/* Health */}
        <div className="w-full max-w-2xl flex items-center gap-2 md:gap-3">
          <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-red-400 font-bold font-mono whitespace-nowrap min-w-[60px] md:min-w-[80px] text-center text-xs md:text-sm">
             HP {Math.ceil(playerHp)}
          </div>
          <div className="flex-grow h-4 md:h-6 bg-slate-900/80 rounded-sm overflow-hidden border border-slate-600 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative transform skew-x-[-10deg]">
            <div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-green-500 transition-all duration-300 ease-out" style={{ width: `${Math.max(0, (playerHp / maxHp) * 100)}%` }} />
          </div>
        </div>
        {/* XP */}
        <div className="w-full max-w-2xl flex items-center gap-2 md:gap-3">
          <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-purple-400 font-bold font-mono whitespace-nowrap min-w-[60px] md:min-w-[80px] text-center text-xs md:text-sm">
             LV {stats.playerLevel}
          </div>
          <div className="flex-grow h-2 md:h-3 bg-slate-900/80 rounded-full overflow-hidden border border-slate-800 shadow-lg relative">
            <div className="h-full bg-gradient-to-r from-purple-900 via-purple-600 to-fuchsia-500 transition-all duration-300 ease-out" style={{ width: `${Math.min(100, (playerXp / maxXp) * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
