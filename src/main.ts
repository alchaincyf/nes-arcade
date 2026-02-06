import { Game } from '@/types';
import { GAMES } from '@/data/games';
import { NesEmulator } from '@/emulator';
import { GameUI } from '@/components/ui';
import { VirtualGamepad } from '@/components/virtual-gamepad';

/* ===========================
   Initialise modules
   =========================== */

const appRoot = document.getElementById('app')!;

const emulator = new NesEmulator();
const gamepad = new VirtualGamepad();

const ui = new GameUI(appRoot, {
  onGameSelect: handleGameSelect,
  onPlayerStart: () => emulator.start(),
  onPlayerPause: () => emulator.pause(),
  onPlayerReset: () => emulator.reset(),
  onPlayerStop: () => {
    emulator.stop();
    gamepad.hide();
  },
  onPlayerFullscreen: () => {
    /* handled by UI class via CSS */
  },
  onPlayerMute: () => emulator.toggleMute(),
  onKeysChanged: (keys) => {
    emulator.setKeysP1(keys);
  },
});

// Apply saved key config on startup
emulator.setKeysP1(ui.getKeys());

/* ===========================
   Render
   =========================== */

ui.render(GAMES);

/* ===========================
   Game selection handler
   =========================== */

async function handleGameSelect(game: Game): Promise<void> {
  // Open the player modal
  ui.openPlayer(game);

  // Get the canvas for the emulator
  const canvas = ui.getCanvas();
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  try {
    // Fetch the ROM file
    const response = await fetch(`/roms/${game.romFile}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ROM: ${response.status} ${response.statusText}`);
    }

    const romData = await response.arrayBuffer();

    // Attach canvas and load ROM into emulator
    emulator.attachCanvas(canvas);
    emulator.loadRom(new Uint8Array(romData), game.id);
    ui.hidePlayerLoading();
    emulator.start();

    // Show virtual gamepad on touch devices
    const gpContainer = ui.getGamepadContainer();
    console.log('[Main] gpContainer =', gpContainer?.tagName, gpContainer?.id, 'isTouch =', gamepad.isTouch);
    if (gpContainer) {
      gamepad.show(
        gpContainer,
        (player, button) => {
          console.log('[Main] >>> buttonDown', player, button);
          emulator.buttonDown(player, button);
        },
        (player, button) => {
          console.log('[Main] >>> buttonUp', player, button);
          emulator.buttonUp(player, button);
        }
      );
    }
  } catch (err) {
    console.error('Failed to load game:', game.title, err);
    ui.hidePlayerLoading();
  }
}
