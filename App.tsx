
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  GameState, AppSettings, GridConfig, GameMode, 
  TileValue, Theme, LeaderboardEntry 
} from './types';
import { THEMES, FONTS } from './constants';
import { 
  shuffleBoard, isSolved, getPossibleMoves, 
  calculateScore, generateGoal, performMove 
} from './utils/puzzleUtils';
import { solveAStar } from './utils/solver';
import SettingsPanel from './components/SettingsPanel';
import Tile from './components/Tile';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('gridshift-game');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure isPaused is false on load to avoid confusion
        return { ...parsed, isPaused: false };
    }
    return {
      board: shuffleBoard({ rows: 3, cols: 3 }),
      config: { rows: 3, cols: 3 },
      moves: 0,
      startTime: null,
      endTime: null,
      isSolved: false,
      isPaused: false,
      mode: GameMode.NORMAL,
      aiPath: null,
      isAIPlaying: false
    };
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('gridshift-settings');
    return saved ? JSON.parse(saved) : {
      theme: THEMES[1],
      font: 'Inter',
      showNumbers: true,
      tileOpacity: 0.8,
      username: 'Player1'
    };
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('gridshift-leaderboard');
    return saved ? JSON.parse(saved) : [];
  });

  const [time, setTime] = useState(0);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('gridshift-game', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    localStorage.setItem('gridshift-settings', JSON.stringify(settings));
  }, [settings]);

  // Timer logic: stops if paused or solved
  useEffect(() => {
    let interval: any;
    if (gameState.startTime && !gameState.endTime && !gameState.isSolved && !gameState.isPaused) {
      interval = setInterval(() => {
        setTime(Math.floor((Date.now() - gameState.startTime!) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.startTime, gameState.endTime, gameState.isSolved, gameState.isPaused]);

  const handleGenerate = () => {
    // Validation
    if (gameState.config.rows < 2 || gameState.config.rows > 100 || gameState.config.cols < 2 || gameState.config.cols > 100) {
      return; // Handled by UI validation in SettingsPanel
    }

    setGameState(prev => ({
      ...prev,
      board: shuffleBoard(prev.config),
      moves: 0,
      startTime: Date.now(),
      endTime: null,
      isSolved: false,
      isPaused: false,
      aiPath: null,
      isAIPlaying: false
    }));
    setTime(0);
  };

  const togglePause = () => {
    if (gameState.isSolved || !gameState.startTime) return;
    setGameState(prev => {
        const pausing = !prev.isPaused;
        let nextStartTime = prev.startTime;
        
        // When unpausing, we need to adjust the startTime so the timer doesn't "jump"
        if (!pausing && prev.startTime) {
            // We basically reset startTime to current time minus the already elapsed 'time'
            nextStartTime = Date.now() - (time * 1000);
        }

        return {
            ...prev,
            isPaused: pausing,
            startTime: nextStartTime
        };
    });
  };

  const moveTile = async (index: number) => {
    if (gameState.isSolved || gameState.isAIPlaying || gameState.isPaused || isAnimating) return;

    const possibleMoves = getPossibleMoves(gameState.board, gameState.config);
    const move = possibleMoves.find(m => m.index === index);

    if (move) {
      setIsAnimating(true);
      const newBoard = performMove(gameState.board, gameState.config, move);
      
      // Artificial delay for animation smoothness
      await new Promise(r => setTimeout(r, 200));

      const solved = isSolved(newBoard);
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        moves: prev.moves + 1,
        isSolved: solved,
        endTime: solved ? Date.now() : null
      }));

      if (solved && gameState.mode !== GameMode.AI_SOLVE) {
        submitScore(gameState.moves + 1);
      }
      setIsAnimating(false);
    }
  };

  const submitScore = (finalMoves: number) => {
    const finalTime = time;
    const score = calculateScore(gameState.config.rows, gameState.config.cols, finalMoves, finalTime);
    const entry: LeaderboardEntry = {
      id: crypto.randomUUID(),
      username: settings.username,
      gridSize: `${gameState.config.rows}x${gameState.config.cols}`,
      moves: finalMoves,
      time: finalTime,
      score,
      date: Date.now()
    };
    const newLB = [...leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);
    setLeaderboard(newLB);
    localStorage.setItem('gridshift-leaderboard', JSON.stringify(newLB));
  };

  const handleAISolve = async () => {
    if (gameState.isSolved || gameState.isAIPlaying || gameState.isPaused) return;
    const path = await solveAStar(gameState.board, gameState.config);
    if (!path) {
      alert("Grid too complex for AI. Try a smaller grid!");
      return;
    }

    setGameState(prev => ({ ...prev, isAIPlaying: true, isPaused: false }));
    
    let currentBoard = [...gameState.board];
    for (const move of path) {
      await new Promise(r => setTimeout(r, 300));
      currentBoard = performMove(currentBoard, gameState.config, move);
      setGameState(prev => ({
        ...prev,
        board: [...currentBoard],
        moves: prev.moves + 1
      }));
    }
    setGameState(prev => ({ ...prev, isSolved: true, isAIPlaying: false }));
  };

  const currentScore = useMemo(() => {
    return calculateScore(gameState.config.rows, gameState.config.cols, gameState.moves, time);
  }, [gameState.config, gameState.moves, time]);

  // Create a stable list of tile IDs to map over. 
  // This ensures DOM elements are reused for animations.
  const tileIds = useMemo(() => {
    const size = gameState.config.rows * gameState.config.cols;
    return Array.from({ length: size - 1 }, (_, i) => i + 1);
  }, [gameState.config.rows, gameState.config.cols]);

  return (
    <div 
      className="min-h-screen text-slate-100 flex flex-col md:flex-row p-4 md:p-10 gap-10 transition-colors duration-1000 overflow-x-hidden"
      style={{ 
        background: settings.theme.value,
        fontFamily: `${settings.font}, sans-serif`
      }}
    >
      {/* Sidebar Section */}
      <div className="w-full md:w-80 space-y-6 shrink-0 z-10">
        <div className="bg-white/10 backdrop-blur-3xl border border-white/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
             <i className="fas fa-cubes text-4xl"></i>
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-1 text-white">GridShift</h1>
          <p className="text-xs font-bold text-white/50 tracking-widest uppercase">The Ultimate Puzzler</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/40 backdrop-blur-xl p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Live Score</p>
            <p className="text-2xl font-black">{currentScore}</p>
          </div>
          <div className="bg-black/40 backdrop-blur-xl p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Time</p>
            <p className="text-2xl font-black font-mono">{Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</p>
          </div>
        </div>

        <div className="flex gap-4">
            <button 
                onClick={togglePause}
                disabled={gameState.isSolved || !gameState.startTime}
                className={`flex-1 ${gameState.isPaused ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'} disabled:opacity-30 py-4 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl transition-all`}
            >
                <i className={`fas ${gameState.isPaused ? 'fa-play' : 'fa-pause'}`}></i>
                {gameState.isPaused ? 'Resume' : 'Pause'}
            </button>
        </div>

        <SettingsPanel 
          settings={settings}
          config={gameState.config}
          mode={gameState.mode}
          onSettingsChange={(u) => setSettings(s => ({ ...s, ...u }))}
          onConfigChange={(u) => setGameState(g => ({ ...g, config: { ...g.config, ...u } }))}
          onModeChange={(m) => setGameState(g => ({ ...g, mode: m }))}
          onGenerate={handleGenerate}
        />

        <button 
          onClick={handleAISolve}
          disabled={gameState.isAIPlaying || gameState.isSolved || gameState.isPaused}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 py-4 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-purple-900/40"
        >
          <i className="fas fa-robot"></i>
          {gameState.isAIPlaying ? 'Computing Path...' : 'AI Auto-Solve'}
        </button>
      </div>

      {/* Game Board Section */}
      <div className="flex-1 flex flex-col items-center justify-center z-10">
        <div className="bg-black/20 p-2 rounded-[2rem] shadow-2xl backdrop-blur-sm border border-white/10 w-full max-w-2xl aspect-square flex items-center justify-center relative">
          <div 
            className={`w-full h-full p-2 transition-opacity duration-300 relative ${gameState.isPaused ? 'opacity-20 blur-sm grayscale' : 'opacity-100'}`}
          >
            {tileIds.map((val) => {
              const currentIdx = gameState.board.indexOf(val);
              const r = Math.floor(currentIdx / gameState.config.cols);
              const c = currentIdx % gameState.config.cols;
              
              const emptyIdx = gameState.board.indexOf(0);
              const rEmpty = Math.floor(emptyIdx / gameState.config.cols);
              const cEmpty = emptyIdx % gameState.config.cols;

              const isHighlighted = r === hoveredRow || c === hoveredCol;

              return (
                <Tile 
                  key={val}
                  value={val}
                  row={r}
                  col={c}
                  config={gameState.config}
                  settings={settings}
                  onClick={() => moveTile(currentIdx)}
                  isCorrect={val === currentIdx + 1}
                  isHighlighted={isHighlighted}
                  onMouseEnter={() => {
                    setHoveredRow(r);
                    setHoveredCol(c);
                  }}
                  onMouseLeave={() => {
                    setHoveredRow(null);
                    setHoveredCol(null);
                  }}
                />
              );
            })}
          </div>

          {gameState.isPaused && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/10 backdrop-blur-md rounded-[2rem]">
                <div className="p-8 bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl text-center transform scale-110">
                    <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/50">
                        <i className="fas fa-pause text-amber-500 text-3xl"></i>
                    </div>
                    <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Game Paused</h2>
                    <p className="text-white/50 text-xs mb-6 px-4">Take a breather. The grid will be waiting.</p>
                    <button 
                        onClick={togglePause}
                        className="bg-amber-500 hover:bg-amber-400 text-black px-10 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-amber-500/20"
                    >
                        Resume Game
                    </button>
                </div>
            </div>
          )}

          {gameState.isSolved && (
             <div className="absolute inset-0 bg-black/80 backdrop-blur-xl rounded-[2rem] flex flex-col items-center justify-center z-50 p-10 text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/40">
                    <i className="fas fa-check text-4xl"></i>
                </div>
                <h2 className="text-5xl font-black mb-2 italic">SOLVED!</h2>
                <p className="text-white/60 mb-8 max-w-sm">Great work! You finished in {gameState.moves} moves. Ready for a bigger challenge?</p>
                <button 
                  onClick={handleGenerate}
                  className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 rounded-full font-black uppercase tracking-widest text-sm"
                >
                  New Challenge
                </button>
             </div>
          )}
        </div>

        {/* Leaderboard Section */}
        <div className="mt-12 w-full max-w-2xl bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black flex items-center gap-3">
                 <i className="fas fa-trophy text-yellow-500"></i>
                 Global Hall of Fame
              </h3>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Top 10 Players</span>
           </div>
           <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-center py-10 text-white/20 italic font-medium">No records yet. Be the first to win!</p>
              ) : leaderboard.map((entry, i) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                   <div className="flex items-center gap-4">
                      <span className="text-lg font-black text-white/20 w-6">#{i + 1}</span>
                      <div>
                         <p className="font-bold">{entry.username}</p>
                         <p className="text-[10px] text-white/40">{entry.gridSize} • {entry.moves} moves</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="font-black text-blue-400">{entry.score}</p>
                      <p className="text-[10px] text-white/40">{Math.floor(entry.time / 60)}m {entry.time % 60}s</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Performance & Visual Enhancements */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0 overflow-hidden">
         <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full blur-[160px]"></div>
         <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500 rounded-full blur-[160px]"></div>
         <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-emerald-500 rounded-full blur-[160px]"></div>
      </div>
    </div>
  );
};

export default App;
