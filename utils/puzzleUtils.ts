import { TileValue, GridConfig } from '../types';

export interface Move {
  index: number;
}

//
// -----------------------------
// GOAL STATE
// -----------------------------
//
export const generateGoal = (config: GridConfig): TileValue[] => {
  const size = config.rows * config.cols;
  const board = Array.from({ length: size - 1 }, (_, i) => i + 1);
  board.push(0);
  return board;
};

//
// -----------------------------
// CHECK SOLVED
// -----------------------------
//
export const isSolved = (board: TileValue[]): boolean => {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === 0;
};

//
// -----------------------------
// GET POSSIBLE MOVES (LINEAR ONLY)
// -----------------------------
//
export const getPossibleMoves = (
  board: TileValue[],
  config: GridConfig
): Move[] => {
  const { rows, cols } = config;

  const blankIndex = board.indexOf(0);
  const blankRow = Math.floor(blankIndex / cols);
  const blankCol = blankIndex % cols;

  const moves: Move[] = [];

  for (let i = 0; i < board.length; i++) {
    if (i === blankIndex) continue;

    const r = Math.floor(i / cols);
    const c = i % cols;

    // Same row OR same column
    if (r === blankRow || c === blankCol) {
      moves.push({ index: i });
    }
  }

  return moves;
};

//
// -----------------------------
// PERFORM LINEAR SLIDE
// -----------------------------
//
export const performMove = (
  board: TileValue[],
  config: GridConfig,
  move: Move
): TileValue[] => {
  const { rows, cols } = config;

  const blankIndex = board.indexOf(0);
  const targetIndex = move.index;

  const blankRow = Math.floor(blankIndex / cols);
  const blankCol = blankIndex % cols;

  const targetRow = Math.floor(targetIndex / cols);
  const targetCol = targetIndex % cols;

  // Must share row or column
  if (blankRow !== targetRow && blankCol !== targetCol) {
    return board;
  }

  const newBoard = [...board];

  //
  // Horizontal slide
  //
  if (targetRow === blankRow) {
    if (targetCol < blankCol) {
      // Slide right
      for (let c = blankCol; c > targetCol; c--) {
        newBoard[blankRow * cols + c] =
          newBoard[blankRow * cols + c - 1];
      }
    } else {
      // Slide left
      for (let c = blankCol; c < targetCol; c++) {
        newBoard[blankRow * cols + c] =
          newBoard[blankRow * cols + c + 1];
      }
    }

    newBoard[targetIndex] = 0;
  }

  //
  // Vertical slide
  //
  else if (targetCol === blankCol) {
    if (targetRow < blankRow) {
      // Slide down
      for (let r = blankRow; r > targetRow; r--) {
        newBoard[r * cols + blankCol] =
          newBoard[(r - 1) * cols + blankCol];
      }
    } else {
      // Slide up
      for (let r = blankRow; r < targetRow; r++) {
        newBoard[r * cols + blankCol] =
          newBoard[(r + 1) * cols + blankCol];
      }
    }

    newBoard[targetIndex] = 0;
  }

  return newBoard;
};

//
// -----------------------------
// SOLVABLE SHUFFLE (SAFE)
// -----------------------------
//
export const shuffleBoard = (config: GridConfig): TileValue[] => {
  let board = generateGoal(config);

  const shuffleMoves = 50 + config.rows * config.cols;

  for (let i = 0; i < shuffleMoves; i++) {
    const possibleMoves = getPossibleMoves(board, config);
    const randomMove =
      possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    board = performMove(board, config, randomMove);
  }

  // Avoid already solved state
  if (isSolved(board)) {
    return shuffleBoard(config);
  }

  return board;
};

//
// -----------------------------
// SCORE
// -----------------------------
//
export const calculateScore = (
  rows: number,
  cols: number,
  moves: number,
  seconds: number
): number => {
  const base = rows * cols * 100;
  const penalty = moves * 20 + seconds;
  return Math.max(0, base - penalty);
};
