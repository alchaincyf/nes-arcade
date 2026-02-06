import { Game, Genre, GenreInfo, GENRES, DEFAULT_KEYS_P1 } from '@/types';

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
}

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

  constructor(rootEl: HTMLElement, callbacks: UICallbacks) {
    this.root = rootEl;
    this.callbacks = callbacks;
    this.bindGlobalKeys();
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
          </div>
          <div class="player-keys">
            <div class="player-keys-title">操作说明</div>
            <div class="player-keys-grid">
              <div class="player-key-group">
                <span class="key-badge">↑↓←→</span> 方向
              </div>
              <div class="player-key-group">
                <span class="key-badge">Z</span> A键
              </div>
              <div class="player-key-group">
                <span class="key-badge">X</span> B键
              </div>
              <div class="player-key-group">
                <span class="key-badge">Enter</span> 开始
              </div>
              <div class="player-key-group">
                <span class="key-badge">Shift</span> 选择
              </div>
              <div class="player-key-group">
                <span class="key-badge">ESC</span> 退出
              </div>
            </div>
          </div>
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
}
