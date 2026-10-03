const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-maximize-toggle'),
  close: () => ipcRenderer.send('window-close'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  selectExportFolder: () => ipcRenderer.invoke('dialog:selectExportFolder')
});
