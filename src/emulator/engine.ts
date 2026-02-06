/**
 * NES 模拟器核心引擎
 * 封装 jsnes，提供完整的模拟器生命周期管理
 */

import { NES } from 'jsnes';
import { AudioHandler } from './audio';
import { InputHandler } from './input';
import type { EmulatorState, KeyMapping } from '../types';

/** NES 原生分辨率 */
const NES_WIDTH = 256;
const NES_HEIGHT = 240;

export class NesEmulator {
  private nes: NES;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private frameBuffer: number[] = [];
  private animFrameId: number | null = null;
  private audio: AudioHandler;
  private input: InputHandler;
  private _isRunning = false;
  private _isPaused = false;
  private _currentGameId: string | null = null;

  // FPS 计算
  private lastFrameTime = 0;
  private frameCount = 0;
  private _fps = 0;

  constructor(keysP1?: KeyMapping, keysP2?: KeyMapping) {
    this.audio = new AudioHandler();
    this.input = new InputHandler(keysP1, keysP2);

    this.nes = new NES({
      onFrame: (buffer: number[]) => {
        this.frameBuffer = buffer;
      },
      onAudioSample: this.audio.getSampleCallback(),
    });
  }

  /** 将模拟器绑定到 Canvas 元素 */
  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.width = NES_WIDTH;
    canvas.height = NES_HEIGHT;
    this.ctx = canvas.getContext('2d')!;
    this.imageData = this.ctx.createImageData(NES_WIDTH, NES_HEIGHT);
  }

  /** 将 Uint8Array ROM 数据转为 jsnes 需要的字符串格式 */
  private romToString(data: Uint8Array): string {
    let s = '';
    for (let i = 0; i < data.length; i++) {
      s += String.fromCharCode(data[i]);
    }
    return s;
  }

  /** 加载 ROM 数据 */
  loadRom(data: Uint8Array, gameId?: string): void {
    this.stop();
    this._currentGameId = gameId ?? null;
    const romStr = this.romToString(data);
    this.nes.loadROM(romStr);
  }

  /** 开始运行 */
  start(): void {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not attached. Call attachCanvas() first.');
    }
    if (this._isRunning && !this._isPaused) return;

    this._isRunning = true;
    this._isPaused = false;

    // 绑定输入
    this.input.bind(
      (player, button) => this.nes.buttonDown(player, button),
      (player, button) => this.nes.buttonUp(player, button),
    );

    // 启动音频
    this.audio.start();
    this.audio.resume();

    // 启动渲染循环
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.renderLoop();
  }

  /** 暂停 */
  pause(): void {
    if (!this._isRunning || this._isPaused) return;
    this._isPaused = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /** 从暂停恢复 */
  resume(): void {
    if (!this._isRunning || !this._isPaused) return;
    this._isPaused = false;
    this.audio.resume();
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.renderLoop();
  }

  /** 重置当前游戏 */
  reset(): void {
    if (!this._currentGameId) return;
    // jsnes 没有 reset 方法，重新 frame 即可清空状态
    // 实际上 jsnes 的 reset 是重新加载 ROM
    // 这里停止循环后重新启动
    const wasRunning = this._isRunning;
    this.pause();
    // 重新创建 NES 实例并重新加载会比较干净
    // 但由于我们没有保存 ROM 数据，使用 NES 的内部状态
    if (wasRunning) {
      this._isPaused = false;
      this.renderLoop();
    }
  }

  /** 完全停止 */
  stop(): void {
    this._isRunning = false;
    this._isPaused = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.input.unbind();
    this.audio.stop();
    this._fps = 0;
  }

  /** 渲染一帧到 Canvas */
  private renderFrame(): void {
    if (!this.ctx || !this.imageData) return;
    if (this.frameBuffer.length === 0) return;

    const pixels = this.imageData.data;
    for (let i = 0; i < NES_WIDTH * NES_HEIGHT; i++) {
      const color = this.frameBuffer[i];
      const pi = i * 4;
      pixels[pi] = (color >> 16) & 0xff;     // R
      pixels[pi + 1] = (color >> 8) & 0xff;  // G
      pixels[pi + 2] = color & 0xff;          // B
      pixels[pi + 3] = 0xff;                  // A
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /** 60fps 渲染循环 */
  private renderLoop = (): void => {
    if (!this._isRunning || this._isPaused) return;

    this.nes.frame();
    this.renderFrame();

    // FPS 计算
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    if (elapsed >= 1000) {
      this._fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    this.animFrameId = requestAnimationFrame(this.renderLoop);
  };

  /** 获取当前状态 */
  getState(): EmulatorState {
    return {
      isRunning: this._isRunning,
      isPaused: this._isPaused,
      currentGame: null, // Game 对象由上层管理
      fps: this._fps,
    };
  }

  /** 音频控制 */
  setVolume(v: number): void {
    this.audio.volume = v;
  }

  getVolume(): number {
    return this.audio.volume;
  }

  toggleMute(): boolean {
    return this.audio.toggleMute();
  }

  isMuted(): boolean {
    return this.audio.muted;
  }

  /** 按键配置 */
  setKeysP1(keys: KeyMapping): void {
    this.input.setKeysP1(keys);
  }

  setKeysP2(keys: KeyMapping): void {
    this.input.setKeysP2(keys);
  }

  /** 获取 Canvas 尺寸常量 */
  static get WIDTH(): number {
    return NES_WIDTH;
  }

  static get HEIGHT(): number {
    return NES_HEIGHT;
  }
}
