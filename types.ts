
export type TileValue = number;

export enum GameMode {
  NORMAL = 'NORMAL',
  TIMED = 'TIMED',
  LIMITED_MOVES = 'LIMITED_MOVES',
  AI_SOLVE = 'AI_SOLVE'
}

export enum ThemeType {
  COLOR = 'COLOR',
  GRADIENT = 'GRADIENT',
  IMAGE = 'IMAGE',
  TEXTURE = 'TEXTURE'
}

export interface Theme {
  id: string;
  name: string;
  type: ThemeType;
  value: string;
}

export interface GridConfig {
  rows: number;
  cols: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  gridSize: string;
  moves: number;
  time: number;
  score: number;
  date: number;
}

export interface GameState {
  board: TileValue[];
  config: GridConfig;
  moves: number;
  startTime: number | null;
  endTime: number | null;
  isSolved: boolean;
  isPaused: boolean;
  mode: GameMode;
  timeLimit?: number;
  moveLimit?: number;
  aiPath: number[] | null;
  isAIPlaying: boolean;
}

export interface AppSettings {
  theme: Theme;
  font: string;
  showNumbers: boolean;
  tileOpacity: number;
  username: string;
}
