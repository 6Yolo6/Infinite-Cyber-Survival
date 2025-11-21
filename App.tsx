
import React, { useState, useRef } from 'react';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { GameState, GameStats, Upgrade, PlayerAttributes, InputMode } from './types';
import { PLAYER_STATS, XP_BASE } from './constants';

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.DEVICE_SELECT);
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.MOUSE_KB);
  const [stats, setStats] = useState<GameStats>({ score: 0, kills: 0, timeAlive: 0, difficulty: 1, playerLevel: 1 });
  const [playerHp, setPlayerHp] = useState(PLAYER_STATS.baseMaxHp);
  const [playerMaxHp, setPlayerMaxHp] = useState(PLAYER_STATS.baseMaxHp); 
  const [playerXp, setPlayerXp] = useState(0);
  const [maxXp, setMaxXp] = useState(XP_BASE);
  const [playerAttributes, setPlayerAttributes] = useState<PlayerAttributes | null>(null);
  const [abilityCooldown, setAbilityCooldown] = useState<{current: number, max: number}>({current: 0, max: 10});
  const [volume, setVolume] = useState(0.5);
  
  const canvasRef = useRef<GameCanvasHandle>(null);

  const handleDeviceSelect = (mode: InputMode) => {
    setInputMode(mode);
    setGameState(GameState.MENU);
  };

  const handleEnterSelection = () => {
    setGameState(GameState.WEAPON_SELECT);
  };

  const handleStartGame = (weaponId: string) => {
    if (canvasRef.current) {
      canvasRef.current.startGame(weaponId);
    }
  };

  const handleRestart = () => {
    setGameState(GameState.WEAPON_SELECT);
  };

  const handleLevelUp = () => {
    setGameState(GameState.LEVEL_UP);
  };

  const handleUpgradeSelect = (upgrade: Upgrade) => {
    if (canvasRef.current) {
      canvasRef.current.applyUpgrade(upgrade);
    }
    setGameState(GameState.PLAYING);
  };
  
  const handleResume = () => {
    setGameState(GameState.PLAYING);
  };

  const handleTriggerAbility = () => {
      if (canvasRef.current) {
          canvasRef.current.triggerAbility();
      }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 touch-none select-none">
      <GameCanvas 
        ref={canvasRef}
        gameState={gameState} 
        inputMode={inputMode}
        setGameState={setGameState}
        setStats={setStats}
        setPlayerHp={setPlayerHp}
        setPlayerMaxHp={setPlayerMaxHp}
        setPlayerXp={setPlayerXp}
        setMaxXp={setMaxXp}
        setPlayerAttributes={setPlayerAttributes}
        setAbilityCooldown={setAbilityCooldown}
        onLevelUp={handleLevelUp}
        volume={volume}
      />
      <UIOverlay 
        gameState={gameState} 
        inputMode={inputMode}
        stats={stats} 
        playerHp={playerHp}
        maxHp={playerMaxHp}
        playerXp={playerXp}
        maxXp={maxXp}
        playerAttributes={playerAttributes}
        abilityCooldown={abilityCooldown}
        volume={volume}
        setVolume={setVolume}
        onDeviceSelect={handleDeviceSelect}
        onEnterSelection={handleEnterSelection}
        onStartGame={handleStartGame}
        onRestart={handleRestart} 
        onUpgradeSelect={handleUpgradeSelect}
        onResume={handleResume}
        onTriggerAbility={handleTriggerAbility}
      />
    </div>
  );
}

export default App;
