import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('widgetWindow', {
  minimize: () => ipcRenderer.invoke('widget:minimize'),
  close: () => ipcRenderer.invoke('widget:close'),
  loadStats: () => ipcRenderer.invoke('stats:load'),
  saveStats: (stats) => ipcRenderer.invoke('stats:save', stats),
});