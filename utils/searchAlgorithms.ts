
import { TileValue, GridConfig, SearchAlgorithm, HeuristicType } from '../types';
import { isSolved, getPossibleMoves, performMove } from './puzzleUtils';

export interface SolveResult {
  path: any[] | null;
  nodesExpanded: number;
  timeTaken: number;
  algorithm: SearchAlgorithm;
}

interface Node {
  board: TileValue[];
  g: number; // cost from start
  h: number; // heuristic cost to goal
  f: number; // total cost
  parent: Node | null;
  move: any;
}

// Helper to serialize state
const serializeState = (board: TileValue[]): string => board.join(',');

// Heuristic: Manhattan Distance
const manhattanDistance = (board: TileValue[], config: GridConfig): number => {
  let distance = 0;
  for (let i = 0; i < board.length; i++) {
    const val = board[i];
    if (val === 0) continue;
    
    const targetIdx = val - 1;
    const currentR = Math.floor(i / config.cols);
    const currentC = i % config.cols;
    const targetR = Math.floor(targetIdx / config.cols);
    const targetC = targetIdx % config.cols;
    
    distance += Math.abs(currentR - targetR) + Math.abs(currentC - targetC);
  }
  return distance;
};

// Heuristic: Misplaced Tiles
const misplacedTiles = (board: TileValue[]): number => {
  let count = 0;
  for (let i = 0; i < board.length; i++) {
    const val = board[i];
    if (val === 0) continue;
    if (val !== i + 1) count++;
  }
  return count;
};

const getHeuristic = (board: TileValue[], config: GridConfig, type: HeuristicType): number => {
  if (type === HeuristicType.MANHATTAN) return manhattanDistance(board, config);
  return misplacedTiles(board);
};

// BFS Implementation
const solveBFS = async (initialBoard: TileValue[], config: GridConfig): Promise<{ path: any[] | null, nodesExpanded: number }> => {
  const queue: Node[] = [{ board: initialBoard, g: 0, h: 0, f: 0, parent: null, move: null }];
  const visited = new Set<string>([serializeState(initialBoard)]);
  let nodesExpanded = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    nodesExpanded++;

    if (isSolved(current.board)) {
      return { path: reconstructPath(current), nodesExpanded };
    }

    // Limit search for performance
    if (nodesExpanded > 50000) break;
    
    // Yield to UI
    if (nodesExpanded % 1000 === 0) await new Promise(r => setTimeout(r, 0));

    const neighbors = getAdjacentMoves(current.board, config);
    for (const move of neighbors) {
      const nextBoard = performMove(current.board, config, move);
      const key = serializeState(nextBoard);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ board: nextBoard, g: current.g + 1, h: 0, f: 0, parent: current, move });
      }
    }
  }
  return { path: null, nodesExpanded };
};

// DFS Implementation (with depth limit to avoid infinite loops/stack overflow)
const solveDFS = async (initialBoard: TileValue[], config: GridConfig, limit: number = 20): Promise<{ path: any[] | null, nodesExpanded: number }> => {
  const stack: Node[] = [{ board: initialBoard, g: 0, h: 0, f: 0, parent: null, move: null }];
  const visited = new Map<string, number>(); // state -> min depth found
  let nodesExpanded = 0;

  while (stack.length > 0) {
    const current = stack.pop()!;
    nodesExpanded++;

    if (isSolved(current.board)) {
      return { path: reconstructPath(current), nodesExpanded };
    }

    if (current.g >= limit) continue;
    if (nodesExpanded > 100000) break;
    
    // Yield to UI
    if (nodesExpanded % 1000 === 0) await new Promise(r => setTimeout(r, 0));

    const key = serializeState(current.board);
    if (visited.has(key) && visited.get(key)! <= current.g) continue;
    visited.set(key, current.g);

    const neighbors = getAdjacentMoves(current.board, config);
    // Reverse to explore in a consistent order
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const move = neighbors[i];
      const nextBoard = performMove(current.board, config, move);
      stack.push({ board: nextBoard, g: current.g + 1, h: 0, f: 0, parent: current, move });
    }
  }
  return { path: null, nodesExpanded };
};

// IDDFS Implementation
const solveIDDFS = async (initialBoard: TileValue[], config: GridConfig): Promise<{ path: any[] | null, nodesExpanded: number }> => {
  let totalNodesExpanded = 0;
  for (let limit = 0; limit <= 50; limit++) {
    const { path, nodesExpanded } = await solveDFS(initialBoard, config, limit);
    totalNodesExpanded += nodesExpanded;
    if (path) return { path, nodesExpanded: totalNodesExpanded };
    if (totalNodesExpanded > 100000) break;
  }
  return { path: null, nodesExpanded: totalNodesExpanded };
};

// UCS Implementation (Uniform Cost Search is BFS with costs, but here all moves cost 1)
const solveUCS = async (initialBoard: TileValue[], config: GridConfig): Promise<{ path: any[] | null, nodesExpanded: number }> => {
  // Since all costs are 1, UCS is identical to BFS
  return solveBFS(initialBoard, config);
};

// A* Implementation
const solveAStar = async (
  initialBoard: TileValue[], 
  config: GridConfig, 
  heuristicType: HeuristicType
): Promise<{ path: any[] | null, nodesExpanded: number }> => {
  const openList: Node[] = [{ 
    board: initialBoard, 
    g: 0, 
    h: getHeuristic(initialBoard, config, heuristicType), 
    f: 0, 
    parent: null, 
    move: null 
  }];
  openList[0].f = openList[0].g + openList[0].h;
  
  const visited = new Map<string, number>(); // board -> min g
  let nodesExpanded = 0;

  while (openList.length > 0) {
    // Sort by f (simple priority queue)
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;
    nodesExpanded++;

    if (isSolved(current.board)) {
      return { path: reconstructPath(current), nodesExpanded };
    }

    if (nodesExpanded > 50000) break;
    
    // Yield to UI
    if (nodesExpanded % 1000 === 0) await new Promise(r => setTimeout(r, 0));

    const key = serializeState(current.board);
    if (visited.has(key) && visited.get(key)! <= current.g) continue;
    visited.set(key, current.g);

    const neighbors = getAdjacentMoves(current.board, config);
    for (const move of neighbors) {
      const nextBoard = performMove(current.board, config, move);
      const g = current.g + 1;
      const h = getHeuristic(nextBoard, config, heuristicType);
      const f = g + h;
      
      const nextKey = serializeState(nextBoard);
      if (!visited.has(nextKey) || visited.get(nextKey)! > g) {
        openList.push({ board: nextBoard, g, h, f, parent: current, move });
      }
    }
  }
  return { path: null, nodesExpanded };
};

// Helper to reconstruct path from goal node
const reconstructPath = (node: Node): any[] => {
  const path = [];
  let current: Node | null = node;
  while (current && current.move !== null) {
    path.unshift(current.move);
    current = current.parent;
  }
  return path;
};

// Helper to get only adjacent moves (standard 8-puzzle)
const getAdjacentMoves = (board: TileValue[], config: GridConfig) => {
  const { cols } = config;
  const blankIndex = board.indexOf(0);
  const blankRow = Math.floor(blankIndex / cols);
  const blankCol = blankIndex % cols;

  const moves = [];
  const directions = [
    { r: -1, c: 0 }, // Up
    { r: 1, c: 0 },  // Down
    { r: 0, c: -1 }, // Left
    { r: 0, c: 1 }   // Right
  ];

  for (const dir of directions) {
    const nr = blankRow + dir.r;
    const nc = blankCol + dir.c;
    if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
      moves.push({ index: nr * cols + nc });
    }
  }
  return moves;
};

export const solvePuzzle = async (
  board: TileValue[], 
  config: GridConfig, 
  algorithm: SearchAlgorithm,
  heuristic: HeuristicType = HeuristicType.MANHATTAN
): Promise<SolveResult> => {
  const start = performance.now();
  let result: { path: any[] | null, nodesExpanded: number };

  // Use setTimeout to allow UI updates if needed, though these are sync for now
  switch (algorithm) {
    case SearchAlgorithm.BFS:
      result = await solveBFS(board, config);
      break;
    case SearchAlgorithm.DFS:
      result = await solveDFS(board, config);
      break;
    case SearchAlgorithm.IDDFS:
      result = await solveIDDFS(board, config);
      break;
    case SearchAlgorithm.UCS:
      result = await solveUCS(board, config);
      break;
    case SearchAlgorithm.ASTAR:
      result = await solveAStar(board, config, heuristic);
      break;
    default:
      result = { path: null, nodesExpanded: 0 };
  }

  const end = performance.now();
  return {
    ...result,
    timeTaken: (end - start) / 1000,
    algorithm
  };
};
