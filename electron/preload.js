import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('widgetWindow', {
  minimize: () => ipcRenderer.invoke('widget:minimize'),
  close: () => ipcRenderer.invoke('widget:close'),
});