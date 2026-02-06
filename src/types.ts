/** 游戏信息 */
export interface Game {
  id: string;
  title: string;
  titleCn: string;
  year: number;
  genre: Genre;
  description: string;
  players: 1 | 2;
  romFile: string;
  thumbnail?: string;
  rating?: number;
  tags?: string[];
}

/** 游戏分类 */
export type Genre =
  | 'action'      // 动作
  | 'adventure'   // 冒险
  | 'rpg'         // 角色扮演
  | 'puzzle'      // 益智
  | 'sports'      // 体育
  | 'shooter'     // 射击
  | 'platform'    // 平台跳跃
  | 'fighting'    // 格斗
  | 'racing'      // 赛车
  | 'strategy'    // 策略
  | 'simulation'  // 模拟
  | 'classic';    // 经典

/** 分类显示信息 */
export interface GenreInfo {
  id: Genre;
  name: string;
  icon: string;
}

/** 模拟器状态 */
export interface EmulatorState {
  isRunning: boolean;
  isPaused: boolean;
  currentGame: Game | null;
  fps: number;
}

/** 按键映射 */
export interface KeyMapping {
  up: string;
  down: string;
  left: string;
  right: string;
  a: string;
  b: string;
  start: string;
  select: string;
}

/** 默认按键 - 玩家1 */
export const DEFAULT_KEYS_P1: KeyMapping = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  a: 'KeyZ',
  b: 'KeyX',
  start: 'Enter',
  select: 'ShiftRight',
};

/** 默认按键 - 玩家2 */
export const DEFAULT_KEYS_P2: KeyMapping = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  a: 'KeyG',
  b: 'KeyH',
  start: 'KeyT',
  select: 'KeyY',
};

/** 分类列表 */
export const GENRES: GenreInfo[] = [
  { id: 'action', name: '动作', icon: '' },
  { id: 'adventure', name: '冒险', icon: '' },
  { id: 'rpg', name: 'RPG', icon: '' },
  { id: 'puzzle', name: '益智', icon: '' },
  { id: 'sports', name: '体育', icon: '' },
  { id: 'shooter', name: '射击', icon: '' },
  { id: 'platform', name: '平台', icon: '' },
  { id: 'fighting', name: '格斗', icon: '' },
  { id: 'racing', name: '赛车', icon: '' },
  { id: 'strategy', name: '策略', icon: '' },
  { id: 'simulation', name: '模拟', icon: '' },
  { id: 'classic', name: '经典', icon: '' },
];
