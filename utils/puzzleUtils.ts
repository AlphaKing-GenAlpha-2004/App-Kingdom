
import { TileValue, GridConfig } from '../types';

/**
 * Validates solvability for N x M sliding puzzle.
 * For any N x M grid, the puzzle is solvable if:
 * 1. If width (cols) is odd: inversion count is even.
 * 2. If width is even:
 *    - Blank on an even row from bottom and inversions are odd.
 *    - Blank on an odd row from bottom and inversions are even.
 */
export const isSolvable = (board: TileValue[], config: GridConfig): boolean => {
  const { rows, cols } = config;
  const flat = board.filter(t => t !== 0);
  let inversions = 0;
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }

  if (cols % 2 !== 0) {
    return inversions % 2 === 0;
  } else {
    const emptyIndex = board.indexOf(0);
    const emptyRowFromBottom = rows - Math.floor(emptyIndex / cols);
    if (emptyRowFromBottom % 2 === 0) {
      return inversions % 2 !== 0;
    } else {
      return inversions % 2 === 0;
    }
  }
};

export const generateGoal = (config: GridConfig): TileValue[] => {
  const size = config.rows * config.cols;
  const board = Array.from({ length: size - 1 }, (_, i) => i + 1);
  board.push(0);
  return board;
};

export const shuffleBoard = (config: GridConfig): TileValue[] => {
  const size = config.rows * config.cols;
  let board = Array.from({ length: size - 1 }, (_, i) => i + 1);
  board.push(0);
  
  let shuffled;
  let attempts = 0;
  do {
    shuffled = [...board].sort(() => Math.random() - 0.5);
    attempts++;
    // Fallback for safety on massive grids if randomization is extremely unlucky
    if (attempts > 100) {
        // Just swap two non-zero adjacent tiles to toggle parity
        const i1 = shuffled.findIndex(x => x !== 0);
        const i2 = shuffled.findIndex((x, i) => x !== 0 && i !== i1);
        [shuffled[i1], shuffled[i2]] = [shuffled[i2], shuffled[i1]];
    }
  } while (!isSolvable(shuffled, config) || isSolved(shuffled, config));
  
  return shuffled;
};

export const isSolved = (board: TileValue[], config?: GridConfig): boolean => {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === 0;
};

export const getPossibleMoves = (board: TileValue[], config: GridConfig): number[] => {
  const { cols, rows } = config;
  const emptyIndex = board.indexOf(0);
  const r = Math.floor(emptyIndex / cols);
  const c = emptyIndex % cols;
  const moves: number[] = [];

  if (r > 0) moves.push(emptyIndex - cols);
  if (r < rows - 1) moves.push(emptyIndex + cols);
  if (c > 0) moves.push(emptyIndex - 1);
  if (c < cols - 1) moves.push(emptyIndex + 1);

  return moves;
};

export const calculateScore = (rows: number, cols: number, moves: number, seconds: number): number => {
  const base = rows * cols * 100;
  const penalty = (moves * 10) + seconds;
  return Math.max(0, base - penalty);
};
