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

/** 按键映射 — 每个动作支持一个或多个按键 */
export interface KeyMapping {
  up: string | string[];
  down: string | string[];
  left: string | string[];
  right: string | string[];
  a: string | string[];
  b: string | string[];
  start: string | string[];
  select: string | string[];
}

/** 按键动作名 */
export type KeyAction = keyof KeyMapping;

/** 所有按键动作列表（用于遍历） */
export const KEY_ACTIONS: KeyAction[] = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

/** 按键动作中文名 */
export const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  up: '上', down: '下', left: '左', right: '右',
  a: 'A键', b: 'B键', start: '开始', select: '选择',
};

/** 默认按键 - 玩家1（WASD + 方向键双重绑定，J/K 操作键） */
export const DEFAULT_KEYS_P1: KeyMapping = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  a: ['KeyK', 'KeyZ'],
  b: ['KeyJ', 'KeyX'],
  start: 'Enter',
  select: 'Space',
};

/** 默认按键 - 玩家2 */
export const DEFAULT_KEYS_P2: KeyMapping = {
  up: 'Numpad8',
  down: 'Numpad5',
  left: 'Numpad4',
  right: 'Numpad6',
  a: 'Numpad2',
  b: 'Numpad1',
  start: 'NumpadAdd',
  select: 'Numpad0',
};

/** 将 KeyCode 转为可读的按键标签 */
export function keyCodeToLabel(code: string): string {
  const map: Record<string, string> = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F',
    KeyG: 'G', KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L',
    KeyM: 'M', KeyN: 'N', KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R',
    KeyS: 'S', KeyT: 'T', KeyU: 'U', KeyV: 'V', KeyW: 'W', KeyX: 'X',
    KeyY: 'Y', KeyZ: 'Z',
    Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
    Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
    Space: 'Space', Enter: 'Enter', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift',
    ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl',
    Numpad0: 'Num0', Numpad1: 'Num1', Numpad2: 'Num2', Numpad3: 'Num3',
    Numpad4: 'Num4', Numpad5: 'Num5', Numpad6: 'Num6', Numpad7: 'Num7',
    Numpad8: 'Num8', Numpad9: 'Num9', NumpadAdd: 'Num+',
  };
  return map[code] ?? code;
}

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
