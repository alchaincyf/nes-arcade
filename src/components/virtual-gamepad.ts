/**
 * Virtual Gamepad for mobile touch controls
 * Renders an NES-style controller overlay with D-pad, A/B, Start/Select
 */

import { BUTTONS, type ButtonCallback } from '../emulator/input';

const isTouchDevice = (): boolean =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

export class VirtualGamepad {
  private container: HTMLElement | null = null;
  private onButtonDown: ButtonCallback | null = null;
  private onButtonUp: ButtonCallback | null = null;
  private activeButtons: Set<string> = new Set();

  /** Whether the device supports touch */
  readonly isTouch = isTouchDevice();

  /** Show the gamepad (attach to DOM) */
  show(
    parent: HTMLElement,
    onButtonDown: ButtonCallback,
    onButtonUp: ButtonCallback
  ): void {
    if (!this.isTouch) return;

    this.onButtonDown = onButtonDown;
    this.onButtonUp = onButtonUp;

    // Remove existing if any
    this.hide();

    this.container = document.createElement('div');
    this.container.className = 'vgamepad';
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);
    this.bindTouch();
  }

  /** Hide and remove the gamepad */
  hide(): void {
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
      <div class="vgamepad-dpad">
        <button class="vgamepad-btn vgamepad-up" data-btn="UP" aria-label="Up"></button>
        <button class="vgamepad-btn vgamepad-left" data-btn="LEFT" aria-label="Left"></button>
        <div class="vgamepad-dpad-center"></div>
        <button class="vgamepad-btn vgamepad-right" data-btn="RIGHT" aria-label="Right"></button>
        <button class="vgamepad-btn vgamepad-down" data-btn="DOWN" aria-label="Down"></button>
      </div>
      <div class="vgamepad-middle">
        <button class="vgamepad-btn vgamepad-fn" data-btn="SELECT">SELECT</button>
        <button class="vgamepad-btn vgamepad-fn" data-btn="START">START</button>
      </div>
      <div class="vgamepad-ab">
        <button class="vgamepad-btn vgamepad-action vgamepad-b" data-btn="B">B</button>
        <button class="vgamepad-btn vgamepad-action vgamepad-a" data-btn="A">A</button>
      </div>
    `;
  }

  private bindTouch(): void {
    if (!this.container) return;

    const buttons = this.container.querySelectorAll<HTMLElement>('.vgamepad-btn');

    buttons.forEach((btn) => {
      const name = btn.dataset.btn;
      if (!name) return;

      // touchstart → press
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.press(name);
        btn.classList.add('pressed');
        this.vibrate();
      }, { passive: false });

      // touchend → release
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.release(name);
        btn.classList.remove('pressed');
      }, { passive: false });

      // touchcancel → release
      btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        this.release(name);
        btn.classList.remove('pressed');
      }, { passive: false });

      // Prevent context menu on long press
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    // Prevent scroll/zoom on the entire gamepad area
    this.container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private press(name: string): void {
    if (this.activeButtons.has(name)) return;
    this.activeButtons.add(name);
    const button = BUTTONS[name as keyof typeof BUTTONS];
    if (button !== undefined) {
      this.onButtonDown?.(1, button);
    }
  }

  private release(name: string): void {
    if (!this.activeButtons.has(name)) return;
    this.activeButtons.delete(name);
    const button = BUTTONS[name as keyof typeof BUTTONS];
    if (button !== undefined) {
      this.onButtonUp?.(1, button);
    }
  }

  private releaseAll(): void {
    for (const name of this.activeButtons) {
      const button = BUTTONS[name as keyof typeof BUTTONS];
      if (button !== undefined) {
        this.onButtonUp?.(1, button);
      }
    }
    this.activeButtons.clear();
  }

  private vibrate(): void {
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  }
}
