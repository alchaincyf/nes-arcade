/**
 * NES 音频处理模块
 * 使用 Web Audio API 处理 jsnes 的音频输出
 */

export class AudioHandler {
  private audioCtx: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private bufferL: Float32Array[] = [];
  private bufferR: Float32Array[] = [];
  private _volume = 1.0;
  private _muted = false;

  get volume(): number {
    return this._volume;
  }

  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(m: boolean) {
    this._muted = m;
  }

  /** 获取 jsnes onAudioSample 回调 */
  getSampleCallback(): (left: number, right: number) => void {
    // 使用一个临时缓冲收集采样，每 4096 个采样为一组
    let samplesL: number[] = [];
    let samplesR: number[] = [];

    return (left: number, right: number) => {
      samplesL.push(left);
      samplesR.push(right);

      if (samplesL.length >= 2048) {
        this.bufferL.push(new Float32Array(samplesL));
        this.bufferR.push(new Float32Array(samplesR));
        samplesL = [];
        samplesR = [];
      }
    };
  }

  /** 启动音频上下文和播放 */
  start(): void {
    if (this.audioCtx) return;

    this.audioCtx = new AudioContext({ sampleRate: 44100 });
    // ScriptProcessorNode 虽已 deprecated 但兼容性最好
    this.scriptNode = this.audioCtx.createScriptProcessor(4096, 0, 2);

    this.scriptNode.onaudioprocess = (e: AudioProcessingEvent) => {
      const outL = e.outputBuffer.getChannelData(0);
      const outR = e.outputBuffer.getChannelData(1);

      if (this._muted) {
        outL.fill(0);
        outR.fill(0);
        // 清空缓冲，避免延迟积累
        this.bufferL.length = 0;
        this.bufferR.length = 0;
        return;
      }

      let offset = 0;
      while (offset < outL.length && this.bufferL.length > 0) {
        const chunkL = this.bufferL[0];
        const chunkR = this.bufferR[0];
        const remaining = outL.length - offset;
        const toCopy = Math.min(remaining, chunkL.length);

        for (let i = 0; i < toCopy; i++) {
          outL[offset + i] = chunkL[i] * this._volume;
          outR[offset + i] = chunkR[i] * this._volume;
        }

        if (toCopy < chunkL.length) {
          // 还有剩余，截断当前 chunk
          this.bufferL[0] = chunkL.subarray(toCopy);
          this.bufferR[0] = chunkR.subarray(toCopy);
        } else {
          this.bufferL.shift();
          this.bufferR.shift();
        }

        offset += toCopy;
      }

      // 如果缓冲不够，剩余部分填 0
      for (let i = offset; i < outL.length; i++) {
        outL[i] = 0;
        outR[i] = 0;
      }

      // 防止缓冲积压导致延迟（保留不超过 3 组）
      if (this.bufferL.length > 3) {
        this.bufferL.splice(0, this.bufferL.length - 3);
        this.bufferR.splice(0, this.bufferR.length - 3);
      }
    };

    this.scriptNode.connect(this.audioCtx.destination);
  }

  /** 停止音频 */
  stop(): void {
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.bufferL.length = 0;
    this.bufferR.length = 0;
  }

  /** 恢复音频上下文（用于用户交互后激活） */
  async resume(): Promise<void> {
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  /** 切换静音 */
  toggleMute(): boolean {
    this._muted = !this._muted;
    return this._muted;
  }
}
