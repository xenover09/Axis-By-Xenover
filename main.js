const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

if (process.resourcesPath) {
  const possibleBinPaths = [
    path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe'),
  ];
  for (const binPath of possibleBinPaths) {
    if (fs.existsSync(binPath)) {
      process.env.ESBUILD_BINARY_PATH = binPath;
      break;
    }
  }
}

const { startServer } = require('./server/dist/index.js');

function readCodeFiles(dir, fileList = [], rootDir = dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build' || file === '.next' || file === '.vscode') continue;
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          readCodeFiles(filePath, fileList, rootDir);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html'].includes(ext)) {
            fileList.push({
              name: file,
              path: path.relative(rootDir, filePath).replace(/\\/g, '/'),
              content: fs.readFileSync(filePath, 'utf-8')
            });
          }
        }
      } catch (err) {}
    }
  } catch (err) {}
  return fileList;
}

let win;

function createWindow(port) {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    autoHideMenuBar: true,
    title: 'Axis',
    icon: path.join(__dirname, 'client/public/assets/axis-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.setMenuBarVisibility(false);
  win.removeMenu();

  const clientDist = path.join(__dirname, 'client/dist/index.html');
  const isDevUrl = process.env.ELECTRON_START_URL || (process.argv.includes('--dev') ? `http://localhost:5173/?port=${port}` : null);
  if (isDevUrl) {
    win.loadURL(isDevUrl).catch(() => {
      if (fs.existsSync(clientDist)) {
        win.loadFile(clientDist, { query: { port: port.toString() } });
      }
    });
  } else if (fs.existsSync(clientDist)) {
    win.loadFile(clientDist, { query: { port: port.toString() } });
  } else {
    win.loadURL(`http://localhost:5173/?port=${port}`);
  }

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

  // Open Folder directly without blocking security warning modal
  ipcMain.handle('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Project Folder'
    });
    if (canceled || !filePaths || filePaths.length === 0) return null;

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
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Export Destination Folder'
    });
    if (canceled || !filePaths || filePaths.length === 0) return null;
    return filePaths[0];
  });

  ipcMain.handle('shell:showInFolder', async (event, fullPath) => {
    if (!fullPath) return false;
    shell.showItemInFolder(fullPath);
    return true;
  });

  ipcMain.handle('shell:openPath', async (event, fullPath) => {
    if (!fullPath) return false;
    await shell.openPath(fullPath);
    return true;
  });

  ipcMain.handle('shell:openExternal', async (event, fullUrl) => {
    if (!fullUrl) return false;
    try {
      await shell.openExternal(fullUrl);
      return true;
    } catch (e) {
      console.error('Failed to open external url:', e);
      return false;
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  ipcMain.handle('app:getMetadata', () => {
    try {
      const pkg = require('./package.json');
      const repo = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository?.url || '');
      return {
        version: app.isPackaged ? app.getVersion() : pkg.version,
        homepage: pkg.homepage || (repo ? repo.replace(/\.git$/, '') + '#readme' : ''),
        repository: repo ? repo.replace(/\.git$/, '') : ''
      };
    } catch (e) {
      return { version: app.getVersion(), homepage: '', repository: '' };
    }
  });

  ipcMain.handle('app:checkForUpdates', async () => {
    try {
      const pkg = require('./package.json');
      const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository?.url || pkg.homepage || '');
      const match = repoUrl ? repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/) : null;
      if (match) {
        const [, owner, repo] = match;
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
          headers: { 'User-Agent': 'Axis-Desktop-App' }
        });
        if (res.ok) {
          const data = await res.json();
          const latest = (data.tag_name || '').replace(/^v/, '');
          if (latest && latest !== pkg.version) {
            return {
              status: 'update-available',
              currentVersion: pkg.version,
              latestVersion: latest,
              url: data.html_url || `${repoUrl.replace(/\.git$/, '')}/releases`,
              message: `New version v${latest} is available!`
            };
          }
        }
      }
      return {
        status: 'up-to-date',
        currentVersion: pkg.version,
        url: repoUrl ? `${repoUrl.replace(/\.git$/, '')}/releases` : '',
        message: `Axis is up to date (v${pkg.version}).`
      };
    } catch (e) {
      const pkg = require('./package.json');
      return {
        status: 'up-to-date',
        currentVersion: pkg.version,
        url: '',
        message: `Axis is up to date (v${pkg.version}).`
      };
    }
  });
}

app.whenReady().then(async () => {
  const port = 17842;
  const userDataPath = app.getPath('userData');
  const remotionDir = path.join(userDataPath, '.remotion');
  const tempRenderDir = path.join(userDataPath, 'render-template');
  const publicDir = path.join(userDataPath, 'public');

  // 1. Ensure all user directories exist in AppData
  [userDataPath, remotionDir, tempRenderDir, publicDir].forEach(d => {
    if (!fs.existsSync(d)) {
      try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
    }
  });

  // 3. Safety net — server startup par sab se pehle: process.chdir(app.getPath('userData'))
  try {
    process.chdir(userDataPath);
  } catch (e) {
    console.warn('Could not chdir to userDataPath:', e);
  }
  
  const templatesDir = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'templates')
    : path.join(__dirname, 'templates');
    
  let assignedPort = port;
  try {
    assignedPort = await startServer(port, templatesDir, userDataPath, publicDir);
  } catch (e) {
    console.warn(`Port ${port} busy or failed, trying dynamic port...`, e);
    try {
      assignedPort = await startServer(0, templatesDir, userDataPath, publicDir);
    } catch (e2) {
      console.error('Failed to start server:', e2);
    }
  }

  ipcMain.on('get-server-port', (event) => {
    event.returnValue = assignedPort;
  });

  // Application Menu: Only File and Help (Edit, Selection, View, Go, Run, Terminal deleted)
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (!win) return;
            const { canceled, filePaths } = await dialog.showOpenDialog(win, {
              properties: ['openDirectory'],
              title: 'Select Project Folder'
            });
            if (canceled || !filePaths || filePaths.length === 0) return;
            const folderPath = filePaths[0];
            try {
              const files = readCodeFiles(folderPath);
              win.webContents.send('menu:openFolderResult', { folderPath, files });
            } catch (e) {
              console.error(e);
            }
          }
        },
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (win) win.webContents.send('menu:newProject');
          }
        },
        { type: 'separator' },
        { label: 'Exit', role: 'quit' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Remotion Documentation',
          click: () => {
            shell.openExternal('https://remotion.dev/docs');
          }
        },
        {
          label: 'About Axis',
          click: () => {
            if (win) win.webContents.send('menu:about');
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(null);

  createWindow(assignedPort);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(assignedPort);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
