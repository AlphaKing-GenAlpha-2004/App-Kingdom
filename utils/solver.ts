
import { TileValue, GridConfig } from '../types';
import { getPossibleMoves, performMove, isSolved } from './puzzleUtils';

interface Node {
  board: TileValue[];
  g: number; // cost from start
  h: number; // heuristic cost to goal
  f: number; // total cost
  parent: Node | null;
  move: any;
}

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

export interface SolveResult {
  path: any[] | null;
  nodesExpanded: number;
}

export const solveAStar = async (initialBoard: TileValue[], config: GridConfig): Promise<SolveResult> => {
  // A* is computationally expensive for large grids. 
  // We limit the search to prevent browser hang.
  const MAX_NODES = 5000;
  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    board: initialBoard,
    g: 0,
    h: manhattanDistance(initialBoard, config),
    f: 0,
    parent: null,
    move: null
  };
  startNode.f = startNode.g + startNode.h;
  openList.push(startNode);

  let nodesCount = 0;

  while (openList.length > 0 && nodesCount < MAX_NODES) {
    nodesCount++;
    
    // Get node with lowest f
    let currentIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[currentIdx].f) {
        currentIdx = i;
      }
    }
    const current = openList.splice(currentIdx, 1)[0];

    if (isSolved(current.board)) {
      const path = [];
      let temp = current;
      while (temp.parent) {
        path.unshift(temp.move);
        temp = temp.parent;
      }
      return { path, nodesExpanded: nodesCount };
    }

    closedSet.add(current.board.join(','));

    const neighbors = getPossibleMoves(current.board, config);
    for (const move of neighbors) {
      const nextBoard = performMove(current.board, config, move);
      const boardKey = nextBoard.join(',');
      
      if (closedSet.has(boardKey)) continue;

      const g = current.g + 1;
      const h = manhattanDistance(nextBoard, config);
      const f = g + h;

      const existingNode = openList.find(n => n.board.join(',') === boardKey);
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
          existingNode.move = move;
        }
      } else {
        openList.push({
          board: nextBoard,
          g, h, f,
          parent: current,
          move
        });
      }
    }
    
    // Yield to main thread occasionally
    if (nodesCount % 500 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  return { path: null, nodesExpanded: nodesCount };
};
