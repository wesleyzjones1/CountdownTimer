import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('widgetWindow', {
  minimize: () => ipcRenderer.invoke('widget:minimize'),
  close: () => ipcRenderer.invoke('widget:close'),
  getBounds: () => ipcRenderer.invoke('widget:get-bounds'),
  setBounds: (bounds) => ipcRenderer.invoke('widget:set-bounds', bounds),
  setPosition: (pos) => ipcRenderer.invoke('widget:set-position', pos),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  onSettingsChange: (handler) => {
    const listener = (_event, settings) => handler(settings);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  loadStats: () => ipcRenderer.invoke('stats:load'),
  saveStats: (stats) => ipcRenderer.invoke('stats:save', stats),
  loadTimer: () => ipcRenderer.invoke('timer:load'),
  saveTimer: (config) => ipcRenderer.invoke('timer:save', config),
});