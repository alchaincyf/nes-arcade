/**
 * Virtual Gamepad for mobile touch controls
 *
 * Strategy: bind pointer/touch events DIRECTLY on each button element
 * (not on document, not using elementFromPoint).
 * This is the most reliable approach across iOS Safari, Chrome, etc.
 *
 * DEBUG: console.log statements added for mobile debugging.
 * Remove after touch issues are resolved.
 */

import { BUTTONS, type ButtonCallback } from '../emulator/input';

const DBG = '[Gamepad]';

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
    console.log(DBG, 'show() called, isTouch =', this.isTouch, 'parent =', parent?.tagName, parent?.id);

    if (!this.isTouch) {
      console.log(DBG, 'NOT a touch device — skipping gamepad');
      return;
    }

    this.onBtnDown = onBtnDown;
    this.onBtnUp = onBtnUp;
    this.hide();

    this.container = document.createElement('div');
    this.container.className = 'vgamepad';
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.bind();

    console.log(DBG, 'show() complete — container appended, events bound');
    console.log(DBG, 'onBtnDown is', typeof this.onBtnDown, '/ onBtnUp is', typeof this.onBtnUp);
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
    console.log(DBG, 'bind() found', btns.length, 'buttons');

    btns.forEach((el) => {
      const name = el.dataset.btn!;
      console.log(DBG, `  binding [${name}] on`, el.tagName, el.className);

      // === Pointer Events ===
      el.addEventListener('pointerdown', (e) => {
        console.log(DBG, `pointerdown [${name}] target=`, (e.target as HTMLElement).tagName, (e.target as HTMLElement).className);
        e.preventDefault();
        this.press(name, el);
      });
      el.addEventListener('pointerup', (e) => {
        console.log(DBG, `pointerup [${name}]`);
        e.preventDefault();
        this.release(name, el);
      });
      el.addEventListener('pointercancel', () => {
        console.log(DBG, `pointercancel [${name}]`);
        this.release(name, el);
      });
      el.addEventListener('lostpointercapture', () => {
        console.log(DBG, `lostpointercapture [${name}]`);
        this.release(name, el);
      });

      // === Touch Events (fallback) ===
      el.addEventListener('touchstart', () => {
        console.log(DBG, `touchstart [${name}]`);
        this.press(name, el);
      });
      el.addEventListener('touchend', () => {
        console.log(DBG, `touchend [${name}]`);
        this.release(name, el);
      });
      el.addEventListener('touchcancel', () => {
        console.log(DBG, `touchcancel [${name}]`);
        this.release(name, el);
      });
    });
  }

  private press(name: string, el: HTMLElement): void {
    if (this.pressedBtns.has(name)) {
      console.log(DBG, `press [${name}] — SKIPPED (already pressed)`);
      return;
    }
    this.pressedBtns.add(name);
    el.classList.add('pressed');

    const code = BTN_MAP[name];
    console.log(DBG, `press [${name}] code=${code} onBtnDown=${typeof this.onBtnDown}`);

    if (code !== undefined && this.onBtnDown) {
      this.onBtnDown(1, code);
      console.log(DBG, `>>> onBtnDown(1, ${code}) CALLED for [${name}]`);
    } else {
      console.warn(DBG, `press [${name}] — NOT SENT! code=${code} onBtnDown=${this.onBtnDown}`);
    }

    try { navigator.vibrate?.(10); } catch { /* ignore */ }
  }

  private release(name: string, el: HTMLElement): void {
    if (!this.pressedBtns.has(name)) return;
    this.pressedBtns.delete(name);
    el.classList.remove('pressed');

    const code = BTN_MAP[name];
    console.log(DBG, `release [${name}] code=${code}`);

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
