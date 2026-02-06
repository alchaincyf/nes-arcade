/**
 * Virtual Gamepad for mobile touch controls
 * Renders an NES-style controller below the game canvas
 * Uses document-level touch tracking for reliable multi-touch
 */

import { BUTTONS, type ButtonCallback } from '../emulator/input';

const isTouchDevice = (): boolean =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

/** Map data-btn attribute values to BUTTONS constants */
const BTN_MAP: Record<string, number> = {
  UP: BUTTONS.UP,
  DOWN: BUTTONS.DOWN,
  LEFT: BUTTONS.LEFT,
  RIGHT: BUTTONS.RIGHT,
  A: BUTTONS.A,
  B: BUTTONS.B,
  SELECT: BUTTONS.SELECT,
  START: BUTTONS.START,
};

export class VirtualGamepad {
  private container: HTMLElement | null = null;
  private onButtonDown: ButtonCallback | null = null;
  private onButtonUp: ButtonCallback | null = null;
  private activeButtons: Map<number, string> = new Map(); // touchId -> btnName
  private handleTouchStart: ((e: TouchEvent) => void) | null = null;
  private handleTouchMove: ((e: TouchEvent) => void) | null = null;
  private handleTouchEnd: ((e: TouchEvent) => void) | null = null;

  readonly isTouch = isTouchDevice();

  show(
    parent: HTMLElement,
    onButtonDown: ButtonCallback,
    onButtonUp: ButtonCallback
  ): void {
    if (!this.isTouch) return;

    this.onButtonDown = onButtonDown;
    this.onButtonUp = onButtonUp;
    this.hide();

    this.container = document.createElement('div');
    this.container.className = 'vgamepad';
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.bindTouch();
  }

  hide(): void {
    this.unbindTouch();
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.releaseAll();
    this.onButtonDown = null;
    this.onButtonUp = null;
  }

  private buildHTML(): string {
    return `
      <div class="vgamepad-left">
        <div class="vgamepad-dpad">
          <div class="vgamepad-btn vgamepad-up" data-btn="UP">
            <span class="vgamepad-arrow">▲</span>
          </div>
          <div class="vgamepad-btn vgamepad-left-btn" data-btn="LEFT">
            <span class="vgamepad-arrow">◀</span>
          </div>
          <div class="vgamepad-dpad-center"></div>
          <div class="vgamepad-btn vgamepad-right-btn" data-btn="RIGHT">
            <span class="vgamepad-arrow">▶</span>
          </div>
          <div class="vgamepad-btn vgamepad-down" data-btn="DOWN">
            <span class="vgamepad-arrow">▼</span>
          </div>
        </div>
      </div>
      <div class="vgamepad-center">
        <div class="vgamepad-btn vgamepad-fn" data-btn="SELECT">SELECT</div>
        <div class="vgamepad-btn vgamepad-fn" data-btn="START">START</div>
      </div>
      <div class="vgamepad-right">
        <div class="vgamepad-btn vgamepad-action vgamepad-b" data-btn="B">B</div>
        <div class="vgamepad-btn vgamepad-action vgamepad-a" data-btn="A">A</div>
      </div>
    `;
  }

  /** Use document-level touch listeners for reliable tracking */
  private bindTouch(): void {
    if (!this.container) return;

    // Prevent scrolling/zooming on the gamepad area
    this.container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    this.handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const btn = this.getBtnAt(touch.clientX, touch.clientY);
        if (btn) {
          e.preventDefault();
          this.pressBtn(touch.identifier, btn);
        }
      }
    };

    this.handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const oldBtn = this.activeButtons.get(touch.identifier);
        const newBtn = this.getBtnAt(touch.clientX, touch.clientY);

        if (oldBtn && oldBtn !== newBtn) {
          // Finger slid off a button
          this.releaseBtn(touch.identifier);
        }
        if (newBtn && newBtn !== oldBtn) {
          // Finger slid onto a new button
          this.pressBtn(touch.identifier, newBtn);
        }
      }
    };

    this.handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.activeButtons.has(touch.identifier)) {
          e.preventDefault();
          this.releaseBtn(touch.identifier);
        }
      }
    };

    document.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
  }

  private unbindTouch(): void {
    if (this.handleTouchStart) {
      document.removeEventListener('touchstart', this.handleTouchStart);
      this.handleTouchStart = null;
    }
    if (this.handleTouchMove) {
      document.removeEventListener('touchmove', this.handleTouchMove);
      this.handleTouchMove = null;
    }
    if (this.handleTouchEnd) {
      document.removeEventListener('touchend', this.handleTouchEnd);
      document.removeEventListener('touchcancel', this.handleTouchEnd);
      this.handleTouchEnd = null;
    }
  }

  /** Find which gamepad button is at (x, y) screen coordinates */
  private getBtnAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    if (!el || !this.container?.contains(el)) return null;
    const btnEl = (el as HTMLElement).closest('[data-btn]') as HTMLElement | null;
    return btnEl?.dataset.btn ?? null;
  }

  private pressBtn(touchId: number, btnName: string): void {
    this.activeButtons.set(touchId, btnName);
    const code = BTN_MAP[btnName];
    if (code !== undefined) {
      this.onButtonDown?.(1, code);
    }
    // Visual feedback
    this.container?.querySelectorAll(`[data-btn="${btnName}"]`)
      .forEach((el) => el.classList.add('pressed'));
    this.vibrate();
  }

  private releaseBtn(touchId: number): void {
    const btnName = this.activeButtons.get(touchId);
    if (!btnName) return;
    this.activeButtons.delete(touchId);

    // Only release if no other finger is on the same button
    const stillHeld = [...this.activeButtons.values()].includes(btnName);
    if (!stillHeld) {
      const code = BTN_MAP[btnName];
      if (code !== undefined) {
        this.onButtonUp?.(1, code);
      }
      this.container?.querySelectorAll(`[data-btn="${btnName}"]`)
        .forEach((el) => el.classList.remove('pressed'));
    }
  }

  private releaseAll(): void {
    for (const [touchId] of this.activeButtons) {
      this.releaseBtn(touchId);
    }
    this.activeButtons.clear();
  }

  private vibrate(): void {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }
}
