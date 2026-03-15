
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
import { solvePuzzle, SolveResult } from './utils/searchAlgorithms';
import { SearchAlgorithm, HeuristicType } from './types';
import SettingsPanel from './components/SettingsPanel';
import Tile from './components/Tile';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const startBoard = shuffleBoard({ rows: 3, cols: 3 });
    const defaultState: GameState = {
      board: startBoard,
      initialBoard: [...startBoard],
      config: { rows: 3, cols: 3, timeLimit: 60, moveLimit: 50 },
      moves: 0,
      startTime: null,
      endTime: null,
      isSolved: false,
      isPaused: false,
      mode: GameMode.NORMAL,
      aiPath: null,
      isAIPlaying: false
    };

    const saved = localStorage.getItem('gridshift-game');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Validate board integrity
            if (!parsed.board || !Array.isArray(parsed.board) || !parsed.board.includes(0)) {
                return defaultState;
            }
            // Ensure initialBoard exists for old saves
            if (!parsed.initialBoard) {
                parsed.initialBoard = [...parsed.board];
            }
            // If no moves have been made, startTime should be null (fix for old persisted states)
            if (parsed.moves === 0) {
                parsed.startTime = null;
            }
            // Ensure isPaused is false on load to avoid confusion
            return { ...parsed, isPaused: false };
        } catch (e) {
            return defaultState;
        }
    }
    return defaultState;
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

  const [time, setTime] = useState(() => {
    if (gameState.startTime && !gameState.endTime) {
      return Math.floor((Date.now() - gameState.startTime) / 1000);
    }
    return 0;
  });
  const [timeRemaining, setTimeRemaining] = useState<number | null>(() => {
    if (gameState.mode === GameMode.TIMED && gameState.timeLimit) {
      if (gameState.startTime && !gameState.endTime) {
        const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
        return Math.max(0, gameState.timeLimit - elapsed);
      }
      return gameState.timeLimit;
    }
    return null;
  });
  const [movesRemaining, setMovesRemaining] = useState<number | null>(null);
  const [failureReason, setFailureReason] = useState<'TIME' | 'MOVES' | null>(null);
  const [aiStats, setAiStats] = useState<{ nodesExpanded: number; timeTaken: number; pathLength: number; algorithm: SearchAlgorithm } | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SearchAlgorithm>(SearchAlgorithm.ASTAR);
  const [selectedHeuristic, setSelectedHeuristic] = useState<HeuristicType>(HeuristicType.MANHATTAN);
  const [animationSpeed, setAnimationSpeed] = useState(300);
  const [isComputing, setIsComputing] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const isPausedRef = React.useRef(gameState.isPaused);

  useEffect(() => {
    isPausedRef.current = gameState.isPaused;
  }, [gameState.isPaused]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('gridshift-game', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    localStorage.setItem('gridshift-settings', JSON.stringify(settings));
  }, [settings]);

  // Timer logic: stops if paused or solved or failed
  useEffect(() => {
    let interval: any;
    if (gameState.startTime && !gameState.endTime && !gameState.isSolved && !gameState.isPaused && !failureReason) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameState.startTime!) / 1000);
        setTime(elapsed);

        if (gameState.mode === GameMode.TIMED && timeRemaining !== null) {
          const remaining = Math.max(0, (gameState.timeLimit || 0) - elapsed);
          setTimeRemaining(remaining);
          if (remaining === 0) {
            setFailureReason('TIME');
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.startTime, gameState.endTime, gameState.isSolved, gameState.isPaused, failureReason, gameState.mode, gameState.timeLimit]);

  const handleGenerate = () => {
    // Validation
    if (gameState.config.rows < 2 || gameState.config.rows > 100 || gameState.config.cols < 2 || gameState.config.cols > 100) {
      return; // Handled by UI validation in SettingsPanel
    }

    const size = gameState.config.rows * gameState.config.cols;
    let timeLimit: number | undefined = gameState.config.timeLimit;
    let moveLimit: number | undefined = gameState.config.moveLimit;

    if (gameState.mode === GameMode.TIMED && !timeLimit) {
      if (size <= 400) timeLimit = 60;
      else if (size <= 2500) timeLimit = 180;
      else timeLimit = 300;
    }

    if (gameState.mode === GameMode.LIMITED_MOVES && !moveLimit) {
      moveLimit = Math.floor(size * 4.0);
    }

    const newBoard = shuffleBoard(gameState.config);
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      initialBoard: [...newBoard],
      moves: 0,
      startTime: null,
      endTime: null,
      isSolved: false,
      isPaused: false,
      aiPath: null,
      isAIPlaying: false,
      timeLimit,
      moveLimit
    }));
    setTime(0);
    setTimeRemaining(timeLimit || null);
    setMovesRemaining(moveLimit || null);
    setFailureReason(null);
    setAiStats(null);
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
    if (gameState.isSolved || gameState.isAIPlaying || gameState.isPaused || isAnimating || failureReason) return;

    const possibleMoves = getPossibleMoves(gameState.board, gameState.config);
    const move = possibleMoves.find(m => m.index === index);

    if (move) {
      setIsAnimating(true);
      try {
        const newBoard = performMove(gameState.board, gameState.config, move);
        
        // Artificial delay for animation smoothness
        await new Promise(r => setTimeout(r, 200));

        const solved = isSolved(newBoard);
        const nextMoves = gameState.moves + 1;

        if (gameState.mode === GameMode.LIMITED_MOVES && movesRemaining !== null) {
          const remaining = movesRemaining - 1;
          setMovesRemaining(remaining);
          if (remaining === 0 && !solved) {
            setFailureReason('MOVES');
          }
        }

        setGameState(prev => ({
          ...prev,
          board: newBoard,
          moves: nextMoves,
          isSolved: solved,
          endTime: solved ? Date.now() : null,
          startTime: prev.startTime || Date.now()
        }));

        if (solved) {
          submitScore(nextMoves);
        }
      } finally {
        setIsAnimating(false);
      }
    }
  };

  const handleRestart = () => {
    if (gameState.isAIPlaying) return;
    setGameState(prev => ({
      ...prev,
      board: [...prev.initialBoard],
      moves: 0,
      startTime: null,
      endTime: null,
      isSolved: false,
      isPaused: false,
      aiPath: null,
      isAIPlaying: false
    }));
    setTime(0);
    setTimeRemaining(gameState.timeLimit || null);
    setMovesRemaining(gameState.moveLimit || null);
    setFailureReason(null);
    setAiStats(null);
  };

  const handleReset = () => {
    localStorage.removeItem('gridshift-game');
    localStorage.removeItem('gridshift-settings');
    window.location.reload();
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
    if (gameState.isSolved || gameState.isAIPlaying || gameState.isPaused || failureReason) return;
    
    setIsComputing(true);
    // Small delay to allow UI to show loading state
    await new Promise(r => setTimeout(r, 100));

    const result = await solvePuzzle(gameState.board, gameState.config, selectedAlgorithm, selectedHeuristic);
    
    setIsComputing(false);

    if (!result.path) {
      alert("Grid too complex for this algorithm or no solution found within limits. Try a smaller grid or A*!");
      return;
    }

    setAiStats({
      nodesExpanded: result.nodesExpanded,
      timeTaken: result.timeTaken,
      pathLength: result.path.length,
      algorithm: result.algorithm
    });

    setGameState(prev => ({ 
      ...prev, 
      isAIPlaying: true, 
      isPaused: false,
      startTime: prev.startTime || Date.now()
    }));
    
    let currentBoard = [...gameState.board];
    for (const move of result.path) {
      // Wait while paused
      while (isPausedRef.current) {
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Check if AI playing was cancelled
      // We can use a ref or check state, but for now we just continue
      
      await new Promise(r => setTimeout(r, animationSpeed));
      currentBoard = performMove(currentBoard, gameState.config, move);
      setGameState(prev => ({
        ...prev,
        board: [...currentBoard],
        moves: prev.moves + 1
      }));
    }
    setGameState(prev => ({ ...prev, isSolved: true, isAIPlaying: false }));
  };

  const stopAISolve = () => {
    setGameState(prev => ({ ...prev, isAIPlaying: false }));
    handleGenerate();
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
      className="min-h-screen text-slate-100 flex flex-col md:flex-row p-4 md:p-10 gap-10 transition-colors duration-1000 overflow-x-hidden relative"
      style={{ 
        background: settings.theme.value,
        fontFamily: `${settings.font}, sans-serif`
      }}
    >
      {/* Top Right Icons */}
      <div className="fixed top-6 right-6 flex items-center gap-4 z-[60]">
        <button 
          onClick={() => setIsInfoModalOpen(true)}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all shadow-lg"
          title="Information"
        >
          <i className="fas fa-info-circle text-lg"></i>
        </button>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all shadow-lg"
          title="GitHub Repository"
        >
          <i className="fab fa-github text-xl"></i>
        </a>
      </div>

      {/* Info Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsInfoModalOpen(false)}
          />
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl p-8 md:p-12">
            <button 
              onClick={() => setIsInfoModalOpen(false)}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors text-2xl"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="space-y-10">
              <header>
                <h2 className="text-3xl font-black tracking-tighter text-white mb-2 italic">GridShift Solver – AI Based 8-Puzzle Application</h2>
                <div className="h-1 w-20 bg-blue-500 rounded-full"></div>
              </header>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest text-sm">SECTION 1: Introduction</h3>
                <p className="text-white/70 leading-relaxed">
                  GridShift Solver is an interactive Artificial Intelligence demonstration that solves the classic <strong className="text-white">8-Puzzle problem</strong> using multiple search algorithms. The application allows users to manually play the puzzle or use AI algorithms to automatically compute the sequence of moves that transforms the initial state into the goal state.
                </p>
                <p className="text-white/70 leading-relaxed">
                  This project demonstrates <strong className="text-white">state space search</strong>, a fundamental concept in Artificial Intelligence where a problem is represented as a set of states connected by possible actions.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest text-sm">SECTION 2: What is the 8-Puzzle Problem?</h3>
                <p className="text-white/70 leading-relaxed">
                  The <strong className="text-white">8-Puzzle</strong> is a sliding tile puzzle consisting of a <strong className="text-white">3×3 grid</strong> containing eight numbered tiles and one blank space.
                </p>
                <div className="bg-black/40 p-6 rounded-3xl border border-white/5 inline-block font-mono text-xl tracking-[0.5em] my-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="text-white">1</div><div className="text-white">2</div><div className="text-white">3</div>
                    <div className="text-white">4</div><div className="text-white">5</div><div className="text-white">6</div>
                    <div className="text-white">7</div><div className="text-white">8</div><div className="w-5 h-5 bg-white/10 rounded-sm mx-auto"></div>
                  </div>
                </div>
                <p className="text-white/70 leading-relaxed">
                  The objective of the puzzle is to rearrange the tiles from an arbitrary starting configuration into the goal configuration by sliding tiles into the empty space.
                </p>
                <div className="space-y-2">
                  <p className="font-bold text-white/90 text-sm italic">Rules of the puzzle:</p>
                  <ul className="space-y-2 text-white/70 text-sm">
                    <li className="flex items-start gap-3"><span className="text-blue-500">•</span><span>Only one tile can move at a time.</span></li>
                    <li className="flex items-start gap-3"><span className="text-blue-500">•</span><span>A tile can move only if it is directly adjacent to the blank space (up, down, left, or right).</span></li>
                    <li className="flex items-start gap-3"><span className="text-blue-500">•</span><span>Diagonal movements are not allowed.</span></li>
                    <li className="flex items-start gap-3"><span className="text-blue-500">•</span><span>Each move slides a tile into the blank space.</span></li>
                  </ul>
                </div>
                <p className="text-white/70 leading-relaxed">
                  The 8-Puzzle is commonly used in Artificial Intelligence to demonstrate <strong className="text-white">search algorithms and heuristic techniques</strong>.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest text-sm">SECTION 3: State Space Representation</h3>
                <p className="text-white/70 leading-relaxed">
                  In Artificial Intelligence, the puzzle is modeled as a <strong className="text-white">state space problem</strong>.
                </p>
                <div className="space-y-4">
                  <div>
                    <p className="font-bold text-white/90 text-sm mb-1">State Representation:</p>
                    <p className="text-white/70 text-sm">Each configuration of the puzzle board represents a <strong className="text-white">state</strong>.</p>
                    <code className="block bg-black/40 p-3 rounded-xl border border-white/5 text-blue-400 text-xs mt-2">
                      [1, 2, 3, 4, 5, 6, 7, 8, 0] // 0 represents the blank tile
                    </code>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="font-bold text-white/90 text-sm mb-1">Initial State</p>
                      <p className="text-white/60 text-xs">The starting arrangement of the puzzle.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="font-bold text-white/90 text-sm mb-1">Goal State</p>
                      <p className="text-white/60 text-xs">The final desired configuration.</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-white/90 text-sm mb-2">Possible Actions:</p>
                    <div className="flex flex-wrap gap-2">
                      {['Move Up', 'Move Down', 'Move Left', 'Move Right'].map(action => (
                        <span key={action} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded-full">{action}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-tighter mb-1">State Space Size</p>
                    <p className="text-white/70 text-xs">The 8-Puzzle has <strong className="text-white">9! = 362,880 possible arrangements</strong>, but only <strong className="text-white">half of them are solvable</strong>.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest text-sm">SECTION 4: AI Search Algorithms Implemented</h3>
                
                <div className="space-y-4 border-l-2 border-white/10 pl-6">
                  <h4 className="text-white font-black italic text-xl">Breadth-First Search (BFS)</h4>
                  <p className="text-white/70 text-sm">An <strong className="text-white">uninformed search algorithm</strong> that explores the state space level by level.</p>
                  <ul className="text-white/60 text-xs space-y-1 list-disc pl-4">
                    <li>Uses a FIFO queue (First In First Out).</li>
                    <li>Guarantees the shortest solution path.</li>
                    <li>High memory usage (stores all nodes at current depth).</li>
                  </ul>
                  <p className="text-blue-400 font-mono text-[10px]">Complexity: O(b^d) Time & Space</p>
                </div>

                <div className="space-y-4 border-l-2 border-white/10 pl-6">
                  <h4 className="text-white font-black italic text-xl">Depth-First Search (DFS)</h4>
                  <p className="text-white/70 text-sm">Explores the state space by going as deep as possible along one branch before backtracking.</p>
                  <ul className="text-white/60 text-xs space-y-1 list-disc pl-4">
                    <li>Uses a stack or recursion.</li>
                    <li>Uses less memory than BFS.</li>
                    <li>Does NOT guarantee the shortest path.</li>
                  </ul>
                  <p className="text-blue-400 font-mono text-[10px]">Complexity: O(b^m) Time, O(bm) Space</p>
                </div>

                <div className="space-y-4 border-l-2 border-white/10 pl-6">
                  <h4 className="text-white font-black italic text-xl">Iterative Deepening DFS (IDDFS)</h4>
                  <p className="text-white/70 text-sm">Combines the advantages of BFS and DFS by performing DFS with increasing depth limits.</p>
                  <ul className="text-white/60 text-xs space-y-1 list-disc pl-4">
                    <li>Guarantees optimal solution like BFS.</li>
                    <li>Uses memory similar to DFS.</li>
                  </ul>
                  <p className="text-blue-400 font-mono text-[10px]">Complexity: O(b^d) Time, O(bd) Space</p>
                </div>

                <div className="space-y-4 border-l-2 border-white/10 pl-6">
                  <h4 className="text-white font-black italic text-xl">Uniform Cost Search (UCS)</h4>
                  <p className="text-white/70 text-sm">Expands nodes based on the <strong className="text-white">lowest path cost</strong> using a priority queue.</p>
                  <ul className="text-white/60 text-xs space-y-1 list-disc pl-4">
                    <li>Guarantees optimal solutions.</li>
                    <li>Similar to Dijkstra's algorithm.</li>
                  </ul>
                </div>

                <div className="space-y-4 border-l-2 border-white/10 pl-6">
                  <h4 className="text-white font-black italic text-xl">A* Search Algorithm</h4>
                  <p className="text-white/70 text-sm">An <strong className="text-white">informed search algorithm</strong> that uses heuristics to guide the search efficiently.</p>
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-center">
                    <p className="text-blue-400 text-lg">f(n) = g(n) + h(n)</p>
                    <p className="text-white/40 text-[10px] mt-2">g(n): cost from start | h(n): estimated cost to goal</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest text-sm">SECTION 5: Heuristics Used</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-white font-bold text-sm">Misplaced Tiles</p>
                    <p className="text-white/60 text-xs leading-relaxed">Counts the number of tiles that are not in their correct position.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-white font-bold text-sm">Manhattan Distance</p>
                    <p className="text-white/60 text-xs leading-relaxed">Sum of horizontal and vertical distances each tile must move to reach its correct position. Generally more accurate.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest text-sm">SECTION 6: Output Information</h3>
                <div className="flex flex-wrap gap-3">
                  {['Solution Path', 'Total Moves', 'Nodes Explored', 'Computation Time', 'Algorithm Used'].map(item => (
                    <div key={item} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 text-[10px] font-medium">{item}</div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest text-sm">SECTION 8: Primary Technologies Used</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                    <i className="fab fa-react text-2xl text-blue-400 mb-2"></i>
                    <p className="text-white font-bold text-[10px] uppercase">React</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                    <i className="fas fa-wind text-2xl text-emerald-400 mb-2"></i>
                    <p className="text-white font-bold text-[10px] uppercase">Tailwind CSS</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                    <i className="fas fa-code text-2xl text-blue-500 mb-2"></i>
                    <p className="text-white font-bold text-[10px] uppercase">TypeScript</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

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
          <div className={`bg-black/40 backdrop-blur-xl p-5 rounded-3xl border transition-all ${gameState.mode === GameMode.LIMITED_MOVES && movesRemaining !== null && movesRemaining <= 5 ? 'border-red-500/50 animate-pulse' : 'border-white/5'}`}>
            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">
              {gameState.mode === GameMode.LIMITED_MOVES ? 'Moves Left' : 'Moves'}
            </p>
            <p className={`text-2xl font-black ${gameState.mode === GameMode.LIMITED_MOVES && movesRemaining !== null && movesRemaining <= 5 ? 'text-red-400' : ''}`}>
              {gameState.mode === GameMode.LIMITED_MOVES ? movesRemaining : gameState.moves}
            </p>
          </div>
          <div className={`bg-black/40 backdrop-blur-xl p-5 rounded-3xl border transition-all ${gameState.mode === GameMode.TIMED && timeRemaining !== null && timeRemaining <= 10 ? 'border-red-500/50 animate-pulse' : 'border-white/5'}`}>
            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">
              {gameState.mode === GameMode.TIMED ? 'Time Left' : 'Time'}
            </p>
            <p className={`text-2xl font-black font-mono ${gameState.mode === GameMode.TIMED && timeRemaining !== null && timeRemaining <= 10 ? 'text-red-400' : ''}`}>
              {gameState.mode === GameMode.TIMED 
                ? `${Math.floor((timeRemaining || 0) / 60)}:${((timeRemaining || 0) % 60).toString().padStart(2, '0')}`
                : `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`
              }
            </p>
          </div>
        </div>

        {!gameState.startTime && !gameState.isSolved && !failureReason && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-center">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">
              Waiting for first move...
            </p>
          </div>
        )}

        {aiStats && (
          <div className="bg-purple-900/40 backdrop-blur-xl p-5 rounded-3xl border border-purple-500/20 space-y-2">
            <p className="text-[10px] uppercase font-bold text-purple-300/60 mb-2 flex items-center gap-2">
              <i className="fas fa-microchip"></i> AI Solver Stats ({aiStats.algorithm})
            </p>
            <div className="grid grid-cols-2 gap-2 text-center mb-2">
              <div>
                <p className="text-[9px] text-purple-300/40 uppercase">Explored</p>
                <p className="text-sm font-bold">{aiStats.nodesExpanded}</p>
              </div>
              <div>
                <p className="text-[9px] text-purple-300/40 uppercase">Calc Time</p>
                <p className="text-sm font-bold">{aiStats.timeTaken.toFixed(3)}s</p>
              </div>
              <div>
                <p className="text-[9px] text-purple-300/40 uppercase">Path</p>
                <p className="text-sm font-bold">{aiStats.pathLength}</p>
              </div>
              <div>
                <p className="text-[9px] text-purple-300/40 uppercase">Moves</p>
                <p className="text-sm font-bold">{gameState.moves}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-black/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Select Algorithm</label>
            <select 
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value as SearchAlgorithm)}
              disabled={gameState.isAIPlaying || isComputing}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            >
              {Object.values(SearchAlgorithm).map(algo => (
                <option key={algo} value={algo} className="bg-slate-900">{algo}</option>
              ))}
            </select>
          </div>

          {selectedAlgorithm === SearchAlgorithm.ASTAR && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Heuristic</label>
              <select 
                value={selectedHeuristic}
                onChange={(e) => setSelectedHeuristic(e.target.value as HeuristicType)}
                disabled={gameState.isAIPlaying || isComputing}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              >
                {Object.values(HeuristicType).map(h => (
                  <option key={h} value={h} className="bg-slate-900">{h}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Anim Speed</label>
              <span className="text-[10px] font-mono text-purple-400">{animationSpeed}ms</span>
            </div>
            <input 
              type="range"
              min="50"
              max="1000"
              step="50"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="flex gap-2">
            {!gameState.isAIPlaying ? (
              <button 
                onClick={handleAISolve}
                disabled={gameState.isSolved || gameState.isPaused || isComputing}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl shadow-purple-900/40 transition-all"
              >
                {isComputing ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Computing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-robot"></i>
                    Solve with AI
                  </>
                )}
              </button>
            ) : (
              <button 
                onClick={stopAISolve}
                className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl shadow-red-900/40 transition-all"
              >
                <i className="fas fa-stop"></i>
                Stop AI
              </button>
            )}
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
            <button 
                onClick={handleRestart}
                disabled={gameState.isAIPlaying || (gameState.moves === 0 && !gameState.isSolved && !failureReason)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 py-4 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl transition-all border border-white/5"
            >
                <i className="fas fa-undo"></i>
                Reset
            </button>
        </div>

        <SettingsPanel 
          settings={settings}
          config={gameState.config}
          mode={gameState.mode}
          onSettingsChange={(u) => setSettings(s => ({ ...s, ...u }))}
          onConfigChange={(u) => setGameState(g => ({ ...g, config: { ...g.config, ...u } }))}
          onModeChange={(m) => {
            setGameState(g => ({ ...g, mode: m }));
            // Reset game on mode change
            setTimeout(() => handleGenerate(), 0);
          }}
          onGenerate={handleGenerate}
        />

        <button 
          onClick={handleReset}
          className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-red-900/30"
        >
          Hard Reset App
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

          {failureReason && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/40 backdrop-blur-md rounded-[2rem]">
                <div className="p-8 bg-slate-900/90 border border-red-500/20 rounded-3xl shadow-2xl text-center transform scale-110">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                        <i className={`fas ${failureReason === 'TIME' ? 'fa-hourglass-end' : 'fa-ban'} text-red-500 text-3xl`}></i>
                    </div>
                    <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">
                      {failureReason === 'TIME' ? 'Time Up!' : 'Out of Moves!'}
                    </h2>
                    <p className="text-white/50 text-xs mb-6 px-4">
                      {failureReason === 'TIME' 
                        ? 'The clock ran out. Better luck next time!' 
                        : 'You used all your moves. Try a more efficient path!'}
                    </p>
                    <button 
                        onClick={handleGenerate}
                        className="bg-red-500 hover:bg-red-400 text-white px-10 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-red-500/20"
                    >
                        Try Again
                    </button>
                </div>
            </div>
          )}

          {gameState.isPaused && !failureReason && (
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
