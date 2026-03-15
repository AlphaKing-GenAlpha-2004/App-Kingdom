
export type TileValue = number;

export enum GameMode {
  NORMAL = 'NORMAL',
  TIMED = 'TIMED',
  LIMITED_MOVES = 'LIMITED_MOVES'
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
  timeLimit?: number;
  moveLimit?: number;
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

export enum SearchAlgorithm {
  BFS = 'Breadth-First Search (BFS)',
  DFS = 'Depth-First Search (DFS)',
  IDDFS = 'Iterative Deepening DFS (IDDFS)',
  UCS = 'Uniform Cost Search (UCS)',
  ASTAR = 'A* Search'
}

export enum HeuristicType {
  MANHATTAN = 'MANHATTAN',
  MISPLACED = 'MISPLACED'
}

export interface GameState {
  board: TileValue[];
  initialBoard: TileValue[];
  config: GridConfig;
  moves: number;
  startTime: number | null;
  endTime: number | null;
  isSolved: boolean;
  isPaused: boolean;
  mode: GameMode;
  timeLimit?: number;
  moveLimit?: number;
  aiPath: any[] | null;
  isAIPlaying: boolean;
}

export interface AppSettings {
  theme: Theme;
  font: string;
  showNumbers: boolean;
  tileOpacity: number;
  username: string;
}
