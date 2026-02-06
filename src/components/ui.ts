import {
  Game, Genre, GenreInfo, GENRES,
  KeyMapping, KeyAction, KEY_ACTIONS, KEY_ACTION_LABELS,
  DEFAULT_KEYS_P1, keyCodeToLabel,
} from '@/types';

/** Genre icon lookup */
const GENRE_MAP = new Map<Genre, GenreInfo>(GENRES.map((g) => [g.id, g]));

/** Genre short labels for thumbnail placeholders */
const GENRE_LABELS: Record<Genre, string> = {
  action: 'ACT',
  adventure: 'ADV',
  rpg: 'RPG',
  puzzle: 'PZL',
  sports: 'SPT',
  shooter: 'STG',
  platform: 'PLT',
  fighting: 'FTG',
  racing: 'RCE',
  strategy: 'SLG',
  simulation: 'SIM',
  classic: 'CLS',
};

/** Callbacks the host app wires up */
export interface UICallbacks {
  onGameSelect: (game: Game) => void;
  onPlayerStart: () => void;
  onPlayerPause: () => void;
  onPlayerReset: () => void;
  onPlayerStop: () => void;
  onPlayerFullscreen: () => void;
  onPlayerMute: () => void;
  onKeysChanged: (keys: KeyMapping) => void;
}

const KEYS_STORAGE_KEY = 'nes-arcade-keys-p1';

export class GameUI {
  private root: HTMLElement;
  private games: Game[] = [];
  private filteredGames: Game[] = [];
  private activeGenre: Genre | null = null;
  private searchQuery = '';
  private callbacks: UICallbacks;
  private isMuted = false;
  private isFullscreen = false;
  private currentGame: Game | null = null;
  private currentKeys: KeyMapping;

  constructor(rootEl: HTMLElement, callbacks: UICallbacks) {
    this.root = rootEl;
    this.callbacks = callbacks;
    this.currentKeys = this.loadKeys();
    this.bindGlobalKeys();
  }

  /** 获取当前按键配置 */
  getKeys(): KeyMapping {
    return this.currentKeys;
  }

  private loadKeys(): KeyMapping {
    try {
      const saved = localStorage.getItem(KEYS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { ...DEFAULT_KEYS_P1 };
  }

  private saveKeys(keys: KeyMapping): void {
    this.currentKeys = keys;
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
    this.callbacks.onKeysChanged(keys);
  }

  /* ===========================
     Public API
     =========================== */

  /** Initial render with full game list */
  render(games: Game[]): void {
    this.games = games;
    this.filteredGames = games;
    this.root.innerHTML = this.buildShell();
    this.bindEvents();
    this.renderGameGrid();
    this.showLoadingScreen();
  }

  /** Get the canvas element for the emulator */
  getCanvas(): HTMLCanvasElement | null {
    return document.getElementById('nes-canvas') as HTMLCanvasElement | null;
  }

  /** Get the gamepad container for virtual controls */
  getGamepadContainer(): HTMLElement | null {
    return document.getElementById('gamepad-container');
  }

  /** Show the player modal for a game */
  openPlayer(game: Game): void {
    this.currentGame = game;
    const overlay = document.getElementById('player-overlay');
    const title = document.getElementById('player-title');
    const loading = document.getElementById('player-loading');
    if (overlay) overlay.classList.add('visible');
    if (title) title.textContent = `${game.titleCn} - ${game.title}`;
    if (loading) loading.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /** Hide the loading spinner inside the player */
  hidePlayerLoading(): void {
    const loading = document.getElementById('player-loading');
    if (loading) loading.classList.add('hidden');
  }

  /** Close the player modal */
  closePlayer(): void {
    this.currentGame = null;
    const overlay = document.getElementById('player-overlay');
    if (overlay) {
      overlay.classList.remove('visible', 'fullscreen');
    }
    this.isFullscreen = false;
    document.body.style.overflow = '';
    this.callbacks.onPlayerStop();
  }

  /** Update displayed game count */
  updateCount(total: number, filtered?: number): void {
    const countEl = document.getElementById('game-count-number');
    const resultsEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = String(total);
    if (resultsEl) {
      resultsEl.textContent =
        filtered !== undefined && filtered !== total
          ? `showing ${filtered} / ${total} games`
          : `${total} games`;
    }
  }

  /* ===========================
     Loading screen
     =========================== */

  private showLoadingScreen(): void {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;
    let progress = 0;
    const bar = screen.querySelector('.loading-bar-fill') as HTMLElement;
    const interval = setInterval(() => {
      progress += Math.random() * 30 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          screen.classList.add('fade-out');
          setTimeout(() => screen.remove(), 500);
        }, 300);
      }
      if (bar) bar.style.width = `${progress}%`;
    }, 200);
  }

  /* ===========================
     HTML Builders
     =========================== */

  private buildShell(): string {
    return `
      ${this.buildLoadingScreen()}
      ${this.buildHeader()}
      ${this.buildGenreBar()}
      <main class="main-content">
        <div class="results-info">
          <span id="results-count">${this.games.length} games</span>
        </div>
        <div class="game-grid" id="game-grid"></div>
      </main>
      ${this.buildFooter()}
      ${this.buildPlayerModal()}
    `;
  }

  private buildLoadingScreen(): string {
    return `
      <div class="loading-screen" id="loading-screen">
        <div class="loading-screen-title">FC 游戏厅</div>
        <div class="loading-bar-track">
          <div class="loading-bar-fill"></div>
        </div>
        <div class="loading-hint">LOADING...</div>
      </div>
    `;
  }

  private buildHeader(): string {
    return `
      <header class="header">
        <div class="header-inner">
          <a class="logo" href="/">
            <span class="logo-text">FC 游戏厅</span>
          </a>
          <div class="search-box">
            <input
              type="text"
              class="search-input"
              id="search-input"
              placeholder="搜索游戏..."
              autocomplete="off"
            />
          </div>
          <div class="game-count">
            <span>GAMES</span>
            <span class="game-count-number" id="game-count-number">${this.games.length}</span>
          </div>
        </div>
      </header>
    `;
  }

  private buildGenreBar(): string {
    const allTag = `<button class="genre-tag active" data-genre="all">全部</button>`;

    const tags = GENRES.map(
      (g) => `<button class="genre-tag" data-genre="${g.id}">${g.name}</button>`
    ).join('');

    return `
      <nav class="genre-bar">
        <div class="genre-bar-inner">
          ${allTag}${tags}
        </div>
      </nav>
    `;
  }

  private buildFooter(): string {
    return `
      <footer class="footer">
        <div class="footer-pixel">PRESS START</div>
        <div>FC 游戏厅 - 红白机经典游戏合集</div>
      </footer>
    `;
  }

  private buildPlayerModal(): string {
    return `
      <div class="player-overlay" id="player-overlay">
        <div class="player-container">
          <div class="player-header">
            <span class="player-title" id="player-title">Loading...</span>
            <button class="player-close" id="player-close">&times;</button>
          </div>
          <div class="player-canvas-wrapper">
            <canvas class="player-canvas" id="nes-canvas" width="256" height="240"></canvas>
            <div class="player-scanlines"></div>
            <div class="player-loading" id="player-loading">
              <div class="player-loading-spinner"></div>
              <div class="player-loading-text">ROM LOADING...</div>
            </div>
          </div>
          <div id="gamepad-container"></div>
          <div class="player-controls">
            <button class="player-btn" id="btn-start">START</button>
            <button class="player-btn" id="btn-pause">PAUSE</button>
            <button class="player-btn" id="btn-reset">RESET</button>
            <button class="player-btn" id="btn-fullscreen">FULL</button>
            <button class="player-btn" id="btn-mute">SOUND</button>
            <button class="player-btn" id="btn-keys">KEYS</button>
          </div>
          <div class="player-keys">
            <div class="player-keys-title">操作说明</div>
            <div class="player-keys-grid" id="keys-display">
              ${this.buildKeysDisplay()}
            </div>
          </div>
          ${this.buildKeysModal()}
        </div>
      </div>
    `;
  }

  /* ===========================
     Game Grid Rendering
     =========================== */

  private renderGameGrid(): void {
    const grid = document.getElementById('game-grid');
    if (!grid) return;

    if (this.filteredGames.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">NO DATA</div>
          <div class="empty-state-text">没有找到游戏</div>
          <div class="empty-state-hint">试试其他关键词或分类</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.filteredGames.map((game) => this.buildGameCard(game)).join('');
    this.updateCount(this.games.length, this.filteredGames.length);
  }

  private buildGameCard(game: Game): string {
    const genre = GENRE_MAP.get(game.genre);
    const genreLabel = GENRE_LABELS[game.genre] || 'NES';
    const stars = game.rating ? '★'.repeat(Math.round(game.rating)) : '';

    const thumbnailContent = game.thumbnail
      ? `<img src="${game.thumbnail}" alt="${game.titleCn}" loading="lazy" />`
      : `<span class="thumb-placeholder"><span class="thumb-initial">${game.titleCn[0]}</span><span class="thumb-label">${genreLabel}</span></span>`;

    return `
      <div class="game-card" data-game-id="${game.id}">
        <div class="game-card-thumbnail">${thumbnailContent}</div>
        <div class="game-card-body">
          <div class="game-card-title">${game.titleCn}</div>
          <div class="game-card-subtitle">${game.title}</div>
          <div class="game-card-meta">
            <span class="game-card-genre">
              ${genre ? genre.name : game.genre}
            </span>
            <span class="game-card-year">${game.year}</span>
            ${game.players === 2 ? '<span class="game-card-players">2P</span>' : ''}
            ${stars ? `<span class="game-card-rating">${stars}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /* ===========================
     Filtering
     =========================== */

  private applyFilters(): void {
    let result = this.games;

    // Genre filter
    if (this.activeGenre) {
      result = result.filter((g) => g.genre === this.activeGenre);
    }

    // Search filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.titleCn.toLowerCase().includes(q) ||
          g.title.toLowerCase().includes(q) ||
          (g.tags && g.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    this.filteredGames = result;
    this.renderGameGrid();
  }

  /* ===========================
     Event Binding
     =========================== */

  private bindEvents(): void {
    // Search
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      let debounceTimer: ReturnType<typeof setTimeout>;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = searchInput.value.trim();
          this.applyFilters();
        }, 200);
      });
    }

    // Genre tags
    this.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tag = target.closest('.genre-tag') as HTMLElement | null;
      if (tag) {
        const genre = tag.dataset.genre;
        // Update active state
        document.querySelectorAll('.genre-tag').forEach((el) => el.classList.remove('active'));
        tag.classList.add('active');

        this.activeGenre = genre === 'all' ? null : (genre as Genre);
        this.applyFilters();
        return;
      }

      // Game card click
      const card = target.closest('.game-card') as HTMLElement | null;
      if (card) {
        const gameId = card.dataset.gameId;
        const game = this.games.find((g) => g.id === gameId);
        if (game) {
          this.callbacks.onGameSelect(game);
        }
        return;
      }
    });

    // Player controls
    document.getElementById('player-close')?.addEventListener('click', () => this.closePlayer());
    document.getElementById('btn-start')?.addEventListener('click', () => this.callbacks.onPlayerStart());
    document.getElementById('btn-pause')?.addEventListener('click', () => this.callbacks.onPlayerPause());
    document.getElementById('btn-reset')?.addEventListener('click', () => this.callbacks.onPlayerReset());
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
    document.getElementById('btn-mute')?.addEventListener('click', () => this.toggleMute());
    document.getElementById('btn-keys')?.addEventListener('click', () => this.openKeysModal());

    // Click outside player to close
    document.getElementById('player-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'player-overlay') {
        this.closePlayer();
      }
    });
  }

  private bindGlobalKeys(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('player-overlay');
        if (overlay?.classList.contains('visible')) {
          this.closePlayer();
        }
      }
    });
  }

  /* ===========================
     Player Helpers
     =========================== */

  private toggleFullscreen(): void {
    const overlay = document.getElementById('player-overlay');
    if (!overlay) return;
    this.isFullscreen = !this.isFullscreen;
    overlay.classList.toggle('fullscreen', this.isFullscreen);
    this.callbacks.onPlayerFullscreen();
  }

  private toggleMute(): void {
    this.isMuted = !this.isMuted;
    const btn = document.getElementById('btn-mute');
    if (btn) {
      btn.textContent = this.isMuted ? 'MUTE' : 'SOUND';
      btn.classList.toggle('active', this.isMuted);
    }
    this.callbacks.onPlayerMute();
  }

  /* ===========================
     Key Configuration
     =========================== */

  /** 将一个按键值（string | string[]）格式化为显示标签 */
  private formatKeyLabel(codes: string | string[]): string {
    const list = Array.isArray(codes) ? codes : [codes];
    return list.map(keyCodeToLabel).join('/');
  }

  /** 构建按键提示显示 */
  private buildKeysDisplay(): string {
    const k = this.currentKeys;
    return `
      <div class="player-key-group">
        <span class="key-badge">${this.formatKeyLabel(k.up)}</span> 上
      </div>
      <div class="player-key-group">
        <span class="key-badge">${this.formatKeyLabel(k.down)}</span> 下
      </div>
      <div class="player-key-group">
        <span class="key-badge">${this.formatKeyLabel(k.left)}</span> 左
      </div>
      <div class="player-key-group">
        <span class="key-badge">${this.formatKeyLabel(k.right)}</span> 右
      </div>
      <div class="player-key-group">
        <span class="key-badge">${this.formatKeyLabel(k.a)}</span> A键
      </div>
      <div class="player-key-group">
        <span class="key-badge">${this.formatKeyLabel(k.b)}</span> B键
      </div>
      <div class="player-key-group">
        <span class="key-badge">${this.formatKeyLabel(k.start)}</span> 开始
      </div>
      <div class="player-key-group">
        <span class="key-badge">${this.formatKeyLabel(k.select)}</span> 选择
      </div>
      <div class="player-key-group">
        <span class="key-badge">ESC</span> 退出
      </div>
    `;
  }

  /** 更新按键提示显示 */
  private refreshKeysDisplay(): void {
    const el = document.getElementById('keys-display');
    if (el) el.innerHTML = this.buildKeysDisplay();
  }

  /** 构建按键设置弹窗 HTML */
  private buildKeysModal(): string {
    return `
      <div class="keys-modal-overlay" id="keys-modal">
        <div class="keys-modal">
          <div class="keys-modal-header">
            <span>按键设置</span>
            <button class="keys-modal-close" id="keys-modal-close">&times;</button>
          </div>
          <div class="keys-modal-body">
            <div class="keys-modal-hint">点击按键区域，然后按下新的按键进行绑定</div>
            <div class="keys-modal-grid" id="keys-modal-grid"></div>
          </div>
          <div class="keys-modal-footer">
            <button class="keys-modal-btn" id="keys-reset-default">恢复默认</button>
            <button class="keys-modal-btn keys-modal-btn-primary" id="keys-save">保存</button>
          </div>
        </div>
      </div>
    `;
  }

  /** 打开按键设置弹窗 */
  private openKeysModal(): void {
    const modal = document.getElementById('keys-modal');
    if (!modal) return;
    modal.classList.add('visible');

    // 复制当前配置用于编辑
    const editKeys: KeyMapping = JSON.parse(JSON.stringify(this.currentKeys));
    this.renderKeysGrid(editKeys);

    // 关闭按钮
    document.getElementById('keys-modal-close')?.addEventListener('click', () => {
      modal.classList.remove('visible');
    });

    // 恢复默认
    document.getElementById('keys-reset-default')?.addEventListener('click', () => {
      const defaultKeys: KeyMapping = JSON.parse(JSON.stringify(DEFAULT_KEYS_P1));
      Object.assign(editKeys, defaultKeys);
      this.renderKeysGrid(editKeys);
    });

    // 保存
    document.getElementById('keys-save')?.addEventListener('click', () => {
      this.saveKeys(editKeys);
      this.refreshKeysDisplay();
      modal.classList.remove('visible');
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'keys-modal') {
        modal.classList.remove('visible');
      }
    });
  }

  /** 渲染按键设置网格 */
  private renderKeysGrid(editKeys: KeyMapping): void {
    const grid = document.getElementById('keys-modal-grid');
    if (!grid) return;

    grid.innerHTML = KEY_ACTIONS.map((action) => {
      const codes = editKeys[action];
      const label = this.formatKeyLabel(codes);
      return `
        <div class="keys-modal-row" data-action="${action}">
          <span class="keys-modal-label">${KEY_ACTION_LABELS[action]}</span>
          <button class="keys-modal-key" data-action="${action}">${label}</button>
        </div>
      `;
    }).join('');

    // 给每个按键按钮绑定监听
    grid.querySelectorAll<HTMLElement>('.keys-modal-key').forEach((btn) => {
      btn.addEventListener('click', () => {
        // 高亮当前正在设置的按钮
        grid.querySelectorAll('.keys-modal-key').forEach((b) => b.classList.remove('listening'));
        btn.classList.add('listening');
        btn.textContent = '按下按键...';

        const handler = (e: KeyboardEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const action = btn.dataset.action as KeyAction;
          // 设置为单个按键（用户自定义时不设多键绑定，简化操作）
          editKeys[action] = e.code;
          btn.textContent = keyCodeToLabel(e.code);
          btn.classList.remove('listening');
          document.removeEventListener('keydown', handler, { capture: true });
        };

        document.addEventListener('keydown', handler, { capture: true });
      });
    });
  }
}
