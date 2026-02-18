
import { TileValue, GridConfig } from '../types';

interface Node {
  board: TileValue[];
  g: number;
  h: number;
  f: number;
  parent: Node | null;
  moveIndex: number;
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

// Simplified Linear Conflict for performance
const linearConflictHeuristic = (board: TileValue[], config: GridConfig): number => {
  const { rows, cols } = config;
  let conflict = 0;

  // Row conflicts
  for (let r = 0; r < rows; r++) {
    for (let c1 = 0; c1 < cols; c1++) {
      for (let c2 = c1 + 1; c2 < cols; c2++) {
        const v1 = board[r * cols + c1];
        const v2 = board[r * cols + c2];
        if (v1 !== 0 && v2 !== 0) {
          const t1 = v1 - 1;
          const t2 = v2 - 1;
          if (Math.floor(t1 / cols) === r && Math.floor(t2 / cols) === r && t1 > t2) {
            conflict += 2;
          }
        }
      }
    }
  }
  return conflict;
};

export const solveAStar = async (board: TileValue[], config: GridConfig, maxNodes = 5000): Promise<number[] | null> => {
  if (board.length > 25) return null; // Safety cap for browser A*

  const startH = manhattanHeuristic(board, config) + linearConflictHeuristic(board, config);
  const startNode: Node = { board, g: 0, h: startH, f: startH, parent: null, moveIndex: -1 };
  
  const openSet: Node[] = [startNode];
  const closedSet = new Set<string>();
  let nodesExpanded = 0;

  while (openSet.length > 0 && nodesExpanded < maxNodes) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    nodesExpanded++;

    if (current.h === 0) {
      const path: number[] = [];
      let temp: Node | null = current;
      while (temp && temp.moveIndex !== -1) {
        path.unshift(temp.moveIndex);
        temp = temp.parent;
      }
      return path;
    }

    const boardStr = current.board.join(',');
    if (closedSet.has(boardStr)) continue;
    closedSet.add(boardStr);

    const emptyIdx = current.board.indexOf(0);
    const r = Math.floor(emptyIdx / config.cols);
    const c = emptyIdx % config.cols;

    const neighbors = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
    ];

    for (const { dr, dc } of neighbors) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
        const targetIdx = nr * config.cols + nc;
        const newBoard = [...current.board];
        [newBoard[emptyIdx], newBoard[targetIdx]] = [newBoard[targetIdx], newBoard[emptyIdx]];
        
        const h = manhattanHeuristic(newBoard, config) + linearConflictHeuristic(newBoard, config);
        openSet.push({
          board: newBoard,
          g: current.g + 1,
          h,
          f: current.g + 1 + h,
          parent: current,
          moveIndex: targetIdx
        });
      }
    }
  }

  return null;
};
