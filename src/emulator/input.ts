/**
 * NES 输入处理模块
 * 将键盘事件转换为 jsnes controller 输入
 */

import type { KeyMapping } from '../types';
import { DEFAULT_KEYS_P1, DEFAULT_KEYS_P2 } from '../types';

/** jsnes 按钮常量（与 jsnes Controller 对应） */
const BUTTONS = {
  A: 0,
  B: 1,
  SELECT: 2,
  START: 3,
  UP: 4,
  DOWN: 5,
  LEFT: 6,
  RIGHT: 7,
} as const;

/** 按键名到 jsnes 按钮编号的映射类型 */
type ButtonName = 'a' | 'b' | 'select' | 'start' | 'up' | 'down' | 'left' | 'right';

const KEY_TO_BUTTON: Record<ButtonName, number> = {
  a: BUTTONS.A,
  b: BUTTONS.B,
  select: BUTTONS.SELECT,
  start: BUTTONS.START,
  up: BUTTONS.UP,
  down: BUTTONS.DOWN,
  left: BUTTONS.LEFT,
  right: BUTTONS.RIGHT,
};

export type ButtonCallback = (player: number, button: number) => void;

export class InputHandler {
  private keysP1: KeyMapping;
  private keysP2: KeyMapping;
  private onButtonDown: ButtonCallback | null = null;
  private onButtonUp: ButtonCallback | null = null;
  private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private handleKeyUp: ((e: KeyboardEvent) => void) | null = null;
  /** code -> { player, button } 的反向查找表 */
  private keyMap: Map<string, { player: number; button: number }> = new Map();

  constructor(keysP1?: KeyMapping, keysP2?: KeyMapping) {
    this.keysP1 = keysP1 ?? DEFAULT_KEYS_P1;
    this.keysP2 = keysP2 ?? DEFAULT_KEYS_P2;
    this.buildKeyMap();
  }

  /** 构建 code -> {player, button} 查找表 */
  private buildKeyMap(): void {
    this.keyMap.clear();
    for (const [name, code] of Object.entries(this.keysP1)) {
      this.keyMap.set(code, { player: 1, button: KEY_TO_BUTTON[name as ButtonName] });
    }
    for (const [name, code] of Object.entries(this.keysP2)) {
      this.keyMap.set(code, { player: 2, button: KEY_TO_BUTTON[name as ButtonName] });
    }
  }

  /** 需要阻止浏览器默认行为的按键集合 */
  private blockedKeys: Set<string> = new Set();

  /** 构建需要拦截的按键集合 */
  private buildBlockedKeys(): void {
    this.blockedKeys.clear();
    for (const code of Object.values(this.keysP1)) {
      this.blockedKeys.add(code);
    }
    for (const code of Object.values(this.keysP2)) {
      this.blockedKeys.add(code);
    }
    // 额外阻止 Space / Tab 防止页面滚动和焦点切换
    this.blockedKeys.add('Space');
    this.blockedKeys.add('Tab');
  }

  /** 绑定键盘事件 */
  bind(onButtonDown: ButtonCallback, onButtonUp: ButtonCallback): void {
    this.onButtonDown = onButtonDown;
    this.onButtonUp = onButtonUp;
    this.buildBlockedKeys();

    // 模糊所有焦点元素，防止 Enter/Space 触发按钮
    (document.activeElement as HTMLElement)?.blur?.();

    this.handleKeyDown = (e: KeyboardEvent) => {
      // 拦截所有游戏按键 + 可能冲突的按键
      if (this.blockedKeys.has(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
      const mapping = this.keyMap.get(e.code);
      if (mapping) {
        this.onButtonDown?.(mapping.player, mapping.button);
      }
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      if (this.blockedKeys.has(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
      const mapping = this.keyMap.get(e.code);
      if (mapping) {
        this.onButtonUp?.(mapping.player, mapping.button);
      }
    };

    // capture: true 确保在浏览器默认行为之前拦截
    document.addEventListener('keydown', this.handleKeyDown, { capture: true });
    document.addEventListener('keyup', this.handleKeyUp, { capture: true });
  }

  /** 解绑键盘事件 */
  unbind(): void {
    if (this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown, { capture: true });
      this.handleKeyDown = null;
    }
    if (this.handleKeyUp) {
      document.removeEventListener('keyup', this.handleKeyUp, { capture: true });
      this.handleKeyUp = null;
    }
    this.onButtonDown = null;
    this.onButtonUp = null;
  }

  /** 更新玩家1按键 */
  setKeysP1(keys: KeyMapping): void {
    this.keysP1 = keys;
    this.buildKeyMap();
  }

  /** 更新玩家2按键 */
  setKeysP2(keys: KeyMapping): void {
    this.keysP2 = keys;
    this.buildKeyMap();
  }

  /** 获取当前按键配置 */
  getKeysP1(): KeyMapping {
    return { ...this.keysP1 };
  }

  getKeysP2(): KeyMapping {
    return { ...this.keysP2 };
  }
}
