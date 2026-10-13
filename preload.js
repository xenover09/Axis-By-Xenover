const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-maximize-toggle'),
  close: () => ipcRenderer.send('window-close'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  selectExportFolder: () => ipcRenderer.invoke('dialog:selectExportFolder'),
  showInFolder: (fullPath) => ipcRenderer.invoke('shell:showInFolder', fullPath),
  openPath: (fullPath) => ipcRenderer.invoke('shell:openPath', fullPath),
  getServerPort: () => ipcRenderer.sendSync('get-server-port'),
  onMenuOpenFolder: (callback) => ipcRenderer.on('menu:openFolderResult', (e, data) => callback(data)),
  onMenuNewProject: (callback) => ipcRenderer.on('menu:newProject', () => callback()),
  getMetadata: () => ipcRenderer.invoke('app:getMetadata'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  onMenuAbout: (callback) => ipcRenderer.on('menu:about', () => callback())
});
