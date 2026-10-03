const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function readCodeFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      readCodeFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        fileList.push({
          name: file,
          path: filePath.replace(/\\/g, '/'),
          content: fs.readFileSync(filePath, 'utf-8')
        });
      }
    }
  }
  return fileList;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: path.join(__dirname, 'client/public/assets/axis-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the Vite dev server
  win.loadURL('http://localhost:5173');

  // Window Controls IPC
  ipcMain.on('window-minimize', () => {
    win.minimize();
  });

  ipcMain.on('window-maximize-toggle', () => {
    if (win.isMaximized()) {
      win.restore();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    win.close();
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    if (canceled) return null;
    const folderPath = filePaths[0];
    try {
      const files = readCodeFiles(folderPath);
      return { folderPath, files };
    } catch (e) {
      console.error(e);
      return { folderPath, files: [], error: e.message };
    }
  });

  ipcMain.handle('dialog:selectExportFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled) return null;
    return filePaths[0];
  });
}

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
