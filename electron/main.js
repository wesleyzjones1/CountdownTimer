import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

const DEFAULT_SETTINGS = {
  showStats: true,
  showTimeWhileRunning: true,
  refreshCooldownEnabled: true,
  hueEnabled: true,
  mouseRefreshEnabled: false,
};

function getBoundsPath() {
  return path.join(app.getPath('userData'), 'widget-bounds.json');
}

function loadBounds() {
  const filePath = getBoundsPath();
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function saveBounds() {
  if (!mainWindow) return;
  try {
    const { x, y, width, height } = mainWindow.getBounds();
    writeFileSync(getBoundsPath(), JSON.stringify({ x, y, width, height }), 'utf8');
  } catch { /* ignore */ }
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'widget-settings.json');
}

function mergeSettings(settings) {
  const showTimeWhileRunning = typeof settings?.showTimeWhileRunning === 'boolean'
    ? settings.showTimeWhileRunning
    : settings?.hideTimeWhileRunning !== true;

  return {
    showStats: settings?.showStats !== false,
    showTimeWhileRunning,
    refreshCooldownEnabled: settings?.refreshCooldownEnabled !== false,
    hueEnabled: settings?.hueEnabled !== false,
    mouseRefreshEnabled: settings?.mouseRefreshEnabled !== false,
  };
}

function publishSettings(settings) {
  mainWindow?.webContents.send('settings:changed', settings);
}

function updateSettings(partial) {
  const next = mergeSettings({ ...loadSettings(), ...partial });
  saveSettings(next);
  publishSettings(next);
  return next;
}

function loadSettings() {
  const filePath = getSettingsPath();
  if (!existsSync(filePath)) return DEFAULT_SETTINGS;
  try {
    return mergeSettings(JSON.parse(readFileSync(filePath, 'utf8')));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  try {
    writeFileSync(getSettingsPath(), JSON.stringify(settings), 'utf8');
  } catch { /* ignore */ }
}

function createSettingsToggle(label, key, settings) {
  return {
    label,
    type: 'checkbox',
    checked: settings[key],
    click: (item) => {
      updateSettings({ [key]: item.checked });
    },
  };
}

function showSettingsMenu() {
  if (!mainWindow) return;
  const settings = loadSettings();
  const menu = Menu.buildFromTemplate([
    createSettingsToggle('Show Stats', 'showStats', settings),
    createSettingsToggle('Show Time While Running', 'showTimeWhileRunning', settings),
    createSettingsToggle('Enable Hue', 'hueEnabled', settings),
    { type: 'separator' },
    createSettingsToggle('5s Refresh Cooldown', 'refreshCooldownEnabled', settings),
    createSettingsToggle('Refresh on Mouse Hover', 'mouseRefreshEnabled', settings),
  ]);
  menu.popup({ window: mainWindow });
}

function createWindow() {
  const savedBounds = loadBounds();
  const initialSize = savedBounds?.width ?? 260;

  mainWindow = new BrowserWindow({
    width: initialSize,
    height: initialSize,
    ...(savedBounds ? { x: savedBounds.x, y: savedBounds.y } : {}),
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    movable: true,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.on('moved', saveBounds);
  mainWindow.on('resize', saveBounds);
  mainWindow.on('close', saveBounds);

  mainWindow.webContents.on('context-menu', showSettingsMenu);
}

ipcMain.handle('widget:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('widget:close', () => {
  mainWindow?.close();
});

ipcMain.handle('menu:show', () => {
  showSettingsMenu();
});

ipcMain.handle('widget:get-bounds', () => {
  if (!mainWindow) return null;
  const { x, y, width, height } = mainWindow.getBounds();
  return { x, y, width, height };
});

ipcMain.handle('widget:set-bounds', (_event, bounds) => {
  if (!mainWindow || !bounds) return;
  const sizeInput = Number(bounds.size);
  const xInput = Number(bounds.x);
  const yInput = Number(bounds.y);
  if (!Number.isFinite(sizeInput) || !Number.isFinite(xInput) || !Number.isFinite(yInput)) return;

  const size = Math.max(1, Math.round(sizeInput));
  const x = Math.round(xInput);
  const y = Math.round(yInput);

  mainWindow.setBounds({ x, y, width: size, height: size });
  saveBounds();
});

ipcMain.handle('widget:set-position', (_event, pos) => {
  if (!mainWindow || !pos) return;
  const x = Math.round(Number(pos.x));
  const y = Math.round(Number(pos.y));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  mainWindow.setPosition(x, y);
  saveBounds();
});

ipcMain.handle('settings:load', () => {
  return loadSettings();
});

ipcMain.handle('settings:save', (_event, settings) => {
  if (!settings || typeof settings !== 'object') return;
  updateSettings(settings);
});

function getStatsPath() {
  return path.join(app.getPath('userData'), 'widget-stats.json');
}

ipcMain.handle('stats:load', () => {
  const filePath = getStatsPath();
  if (!existsSync(filePath)) return { refreshes: 0, timeouts: 0 };
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return { refreshes: 0, timeouts: 0 };
  }
});

ipcMain.handle('stats:save', (_event, stats) => {
  try {
    writeFileSync(getStatsPath(), JSON.stringify(stats), 'utf8');
  } catch { /* ignore write errors */ }
});

function getTimerConfigPath() {
  return path.join(app.getPath('userData'), 'widget-timer.json');
}

ipcMain.handle('timer:load', () => {
  const filePath = getTimerConfigPath();
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
});

ipcMain.handle('timer:save', (_event, config) => {
  try {
    writeFileSync(getTimerConfigPath(), JSON.stringify(config), 'utf8');
  } catch { /* ignore */ }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});