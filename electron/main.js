import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 260,
    height: 260,
    minWidth: 260,
    minHeight: 260,
    maxWidth: 260,
    maxHeight: 260,
    resizable: false,
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

  mainWindow.setAspectRatio(1);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

ipcMain.handle('widget:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('widget:close', () => {
  mainWindow?.close();
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