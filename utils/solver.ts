
import { TileValue, GridConfig } from '../types';
import { getPossibleMoves, performMove, Move } from './puzzleUtils';

interface Node {
  board: TileValue[];
  g: number;
  h: number;
  f: number;
  parent: Node | null;
  move: Move | null;
}

const manhattanHeuristic = (board: TileValue[], config: GridConfig): number => {
  const { cols } = config;
  let distance = 0;
  for (let i = 0; i < board.length; i++) {
    const val = board[i];
    if (val === 0) continue;
    const targetIdx = val - 1;
    const targetR = Math.floor(targetIdx / cols);
    const targetC = targetIdx % cols;
    const currentR = Math.floor(i / cols);
    const currentC = i % cols;
    distance += Math.abs(targetR - currentR) + Math.abs(targetC - currentC);
  }
  return distance;
};

export const solveAStar = async (
  board: TileValue[], 
  config: GridConfig, 
  maxNodes = 10000
): Promise<Move[] | null> => {
  // For larger grids, A* might be too slow in browser
  if (board.length > 16) {
    return solveIDAStar(board, config);
  }

  const startH = manhattanHeuristic(board, config);
  const startNode: Node = { board, g: 0, h: startH, f: startH, parent: null, move: null };
  
  const openSet: Node[] = [startNode];
  const closedSet = new Set<string>();
  let nodesExpanded = 0;

  while (openSet.length > 0 && nodesExpanded < maxNodes) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    nodesExpanded++;

    if (current.h === 0) {
      const path: Move[] = [];
      let temp: Node | null = current;
      while (temp && temp.move) {
        path.unshift(temp.move);
        temp = temp.parent;
      }
      return path;
    }

    const boardStr = current.board.join(',');
    if (closedSet.has(boardStr)) continue;
    closedSet.add(boardStr);

    const possibleMoves = getPossibleMoves(current.board, config);

    for (const move of possibleMoves) {
      const newBoard = performMove(current.board, config, move);
      const boardStr = newBoard.join(',');
      if (closedSet.has(boardStr)) continue;

      const h = manhattanHeuristic(newBoard, config);
      openSet.push({
        board: newBoard,
        g: current.g + 1,
        h,
        f: current.g + 1 + h,
        parent: current,
        move
      });
    }
  }

  return null;
};

// IDA* implementation for larger search spaces
async function solveIDAStar(board: TileValue[], config: GridConfig): Promise<Move[] | null> {
  let threshold = manhattanHeuristic(board, config);
  const path: Move[] = [];
  
  while (threshold < 100) { // Safety cap on threshold
    const result = await search(board, 0, threshold, path, config, new Set());
    if (typeof result === 'object') return result;
    if (result === Infinity) return null;
    threshold = result;
    // Yield to UI thread
    await new Promise(r => setTimeout(r, 0));
  }
  return null;
}

async function search(
  board: TileValue[], 
  g: number, 
  threshold: number, 
  path: Move[], 
  config: GridConfig, 
  visited: Set<string>
): Promise<number | Move[]> {
  const h = manhattanHeuristic(board, config);
  const f = g + h;
  if (f > threshold) return f;
  if (h === 0) return [...path];

  const boardStr = board.join(',');
  visited.add(boardStr);

  let min = Infinity;
  const possibleMoves = getPossibleMoves(board, config);

  for (const move of possibleMoves) {
    const nextBoard = performMove(board, config, move);
    const nextStr = nextBoard.join(',');
    if (visited.has(nextStr)) continue;

    path.push(move);
    const result = await search(nextBoard, g + 1, threshold, path, config, visited);
    if (typeof result === 'object') return result;
    if (result < min) min = result;
    path.pop();
  }

  visited.delete(boardStr);
  return min;
}
