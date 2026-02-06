/**
 * Virtual Gamepad for mobile touch controls
 *
 * Strategy: bind pointer/touch events DIRECTLY on each button element
 * (not on document, not using elementFromPoint).
 * This is the most reliable approach across iOS Safari, Chrome, etc.
 */

import { BUTTONS, type ButtonCallback } from '../emulator/input';

const isTouchDevice = (): boolean =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

/** Map data-btn values to jsnes button constants */
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
  private onBtnDown: ButtonCallback | null = null;
  private onBtnUp: ButtonCallback | null = null;
  private pressedBtns = new Set<string>();

  readonly isTouch = isTouchDevice();

  show(
    parent: HTMLElement,
    onBtnDown: ButtonCallback,
    onBtnUp: ButtonCallback
  ): void {
    if (!this.isTouch) return;

    this.onBtnDown = onBtnDown;
    this.onBtnUp = onBtnUp;
    this.hide();

    this.container = document.createElement('div');
    this.container.className = 'vgamepad';
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.bind();
  }

  hide(): void {
    this.releaseAll();
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.onBtnDown = null;
    this.onBtnUp = null;
  }

  private buildHTML(): string {
    return `
      <div class="vgamepad-left">
        <div class="vgamepad-dpad">
          <div class="vgamepad-up" data-btn="UP"><span class="vgamepad-arrow">▲</span></div>
          <div class="vgamepad-left-btn" data-btn="LEFT"><span class="vgamepad-arrow">◀</span></div>
          <div class="vgamepad-dpad-center"></div>
          <div class="vgamepad-right-btn" data-btn="RIGHT"><span class="vgamepad-arrow">▶</span></div>
          <div class="vgamepad-down" data-btn="DOWN"><span class="vgamepad-arrow">▼</span></div>
        </div>
      </div>
      <div class="vgamepad-center">
        <div class="vgamepad-fn" data-btn="SELECT">SELECT</div>
        <div class="vgamepad-fn" data-btn="START">START</div>
      </div>
      <div class="vgamepad-right">
        <div class="vgamepad-action vgamepad-b" data-btn="B">B</div>
        <div class="vgamepad-action vgamepad-a" data-btn="A">A</div>
      </div>
    `;
  }

  private bind(): void {
    if (!this.container) return;

    // Prevent ALL default touch behaviors on the entire gamepad
    this.container.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    this.container.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Bind events on each button directly
    const btns = this.container.querySelectorAll<HTMLElement>('[data-btn]');
    btns.forEach((el) => {
      const name = el.dataset.btn!;

      // Use BOTH pointer events AND touch events for maximum compatibility.
      // Pointer events: preferred, work on modern iOS/Android/desktop.
      // Touch events: fallback, always fire on mobile.
      // The press/release methods are idempotent so double-firing is safe.

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.press(name, el);
      });
      el.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.release(name, el);
      });
      el.addEventListener('pointercancel', () => {
        this.release(name, el);
      });
      // lostpointercapture fires when implicit capture ends (finger lifted)
      el.addEventListener('lostpointercapture', () => {
        this.release(name, el);
      });

      // Touch event fallback (fires after pointer events, safe due to idempotent handlers)
      el.addEventListener('touchstart', () => {
        this.press(name, el);
      });
      el.addEventListener('touchend', () => {
        this.release(name, el);
      });
      el.addEventListener('touchcancel', () => {
        this.release(name, el);
      });
    });
  }

  private press(name: string, el: HTMLElement): void {
    if (this.pressedBtns.has(name)) return;
    this.pressedBtns.add(name);
    el.classList.add('pressed');

    const code = BTN_MAP[name];
    if (code !== undefined && this.onBtnDown) {
      this.onBtnDown(1, code);
    }

    // Haptic feedback (Android only, iOS doesn't support vibrate)
    try { navigator.vibrate?.(10); } catch { /* ignore */ }
  }

  private release(name: string, el: HTMLElement): void {
    if (!this.pressedBtns.has(name)) return;
    this.pressedBtns.delete(name);
    el.classList.remove('pressed');

    const code = BTN_MAP[name];
    if (code !== undefined && this.onBtnUp) {
      this.onBtnUp(1, code);
    }
  }

  private releaseAll(): void {
    if (!this.container) return;
    for (const name of this.pressedBtns) {
      const code = BTN_MAP[name];
      if (code !== undefined && this.onBtnUp) {
        this.onBtnUp(1, code);
      }
    }
    this.pressedBtns.clear();
    this.container.querySelectorAll('.pressed').forEach((el) => el.classList.remove('pressed'));
  }
}
