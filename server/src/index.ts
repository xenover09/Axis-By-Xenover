import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition, getCompositions } from '@remotion/renderer';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Progress tracking
const renderProgress: Record<string, any> = {};

// Configure unpacked esbuild binary path for packaged Electron app
if ((process as any).resourcesPath) {
  const possibleBinPaths = [
    path.join((process as any).resourcesPath, 'app.asar.unpacked', 'server', 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe'),
    path.join((process as any).resourcesPath, 'app.asar.unpacked', 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe'),
  ];
  for (const unpackedBin of possibleBinPaths) {
    if (fs.existsSync(unpackedBin)) {
      process.env.ESBUILD_BINARY_PATH = unpackedBin;
      console.log('Set ESBUILD_BINARY_PATH to:', unpackedBin);
      break;
    }
  }
}

// FIX #3: Resolve unpacked compositor binaries (ffmpeg.exe, ffprobe.exe, remotion.exe)
function getCompositorBinariesDir(): string | undefined {
  try {
    const compositorPackage = '@remotion/compositor-win32-x64-msvc';
    let rawDir = '';
    try {
      rawDir = require(compositorPackage).dir;
    } catch (e) {
      try {
        rawDir = path.dirname(require.resolve(`${compositorPackage}/package.json`));
      } catch (e2) {}
    }

    if (rawDir) {
      const unpackedDir = rawDir.replace('app.asar', 'app.asar.unpacked');
      if (fs.existsSync(unpackedDir) && fs.existsSync(path.join(unpackedDir, 'ffmpeg.exe'))) {
        process.env.PATH = `${unpackedDir}${path.delimiter}${process.env.PATH || ''}`;
        return unpackedDir;
      }
      if (fs.existsSync(rawDir) && fs.existsSync(path.join(rawDir, 'ffmpeg.exe'))) {
        process.env.PATH = `${rawDir}${path.delimiter}${process.env.PATH || ''}`;
        return rawDir;
      }
    }
  } catch (e) {}

  if ((process as any).resourcesPath) {
    const searchBases = [
      path.join((process as any).resourcesPath, 'app.asar.unpacked', 'server', 'node_modules', '@remotion'),
      path.join((process as any).resourcesPath, 'app.asar.unpacked', 'node_modules', '@remotion'),
      path.join((process as any).resourcesPath, 'app.asar.unpacked', 'client', 'node_modules', '@remotion'),
    ];
    for (const base of searchBases) {
      if (fs.existsSync(base)) {
        try {
          const subdirs = fs.readdirSync(base);
          for (const sub of subdirs) {
            if (sub.startsWith('compositor-')) {
              const cand = path.join(base, sub);
              if (fs.existsSync(path.join(cand, 'ffmpeg.exe')) || fs.existsSync(path.join(cand, 'remotion.exe'))) {
                process.env.PATH = `${cand}${path.delimiter}${process.env.PATH || ''}`;
                return cand;
              }
            }
          }
        } catch (e) {}
      }
    }
  }
  return undefined;
}

export function startServer(
  port: number,
  templatesDir: string,
  userDataPathOrRenderDir: string,
  optionalPublicDir?: string
) {
  let activePort = port;
  // Bundle Cache
  let cachedBundleLocation = '';
  let cachedCodeAndSettings = '';

  // 1. Resolve user writable directories (AppData/Roaming/Axis)
  const userData = fs.existsSync(userDataPathOrRenderDir) && fs.statSync(userDataPathOrRenderDir).isDirectory() && !userDataPathOrRenderDir.endsWith('render-template')
    ? userDataPathOrRenderDir
    : (fs.existsSync(userDataPathOrRenderDir) && userDataPathOrRenderDir.endsWith('render-template'))
      ? path.dirname(userDataPathOrRenderDir)
      : path.join(os.homedir(), 'AppData', 'Roaming', 'Axis');

  const remotionDir = path.join(userData, '.remotion');
  const bundleDir = path.join(remotionDir, 'bundle');
  const renderTemplateDir = path.join(userData, 'render-template');
  const publicDir = optionalPublicDir || path.join(userData, 'public');

  // Ensure all user directories exist in user-writable location
  for (const dir of [userData, remotionDir, bundleDir, renderTemplateDir, publicDir]) {
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
  }

  // Ensure package.json exists in userData and renderTemplateDir so Remotion / Webpack resolver never searches up to Program Files
  for (const dir of [userData, remotionDir, renderTemplateDir]) {
    const pkg = path.join(dir, 'package.json');
    if (!fs.existsSync(pkg)) {
      try {
        fs.writeFileSync(pkg, JSON.stringify({ name: 'axis-remotion-runtime', version: '1.0.0', private: true }, null, 2));
      } catch (e) {}
    }
  }

  // 3. Safety net — server startup par sab se pehle: process.chdir(userData)
  try {
    process.chdir(userData);
  } catch (e) {
    console.warn('Initialization chdir error:', e);
  }

  app.get('/api/templates', (req, res) => {
    try {
      if (!fs.existsSync(templatesDir)) return res.json({ templates: [] });
      const files = fs.readdirSync(templatesDir);
      const templates = files.filter(f => f.endsWith('.tsx')).map(f => f.replace('.tsx', ''));
      res.json({ templates });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/templates/:id', (req, res) => {
    try {
      const { id } = req.params;
      const content = fs.readFileSync(path.join(templatesDir, `${id}.tsx`), 'utf-8');
      res.send(content);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/progress/:id', (req, res) => {
    const data = renderProgress[req.params.id];
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  app.post('/api/render', async (req, res) => {
    const { code, settings, isDraft, files, entryFile, exportDest } = req.body;
    if (!code && (!files || files.length === 0)) return res.status(400).json({ error: 'Code or files required' });
    if (!settings) return res.status(400).json({ error: 'Settings required' });

    const renderId = Date.now().toString();
    renderProgress[renderId] = { status: 'bundling', progress: 0, fps: 0, eta: '' };

    res.json({ renderId });

    try {
      if (!fs.existsSync(renderTemplateDir)) {
        fs.mkdirSync(renderTemplateDir, { recursive: true });
      }

      // Prevent Remotion from trying to write .remotion cache in C:\Program Files
      const renderPkgJson = path.join(renderTemplateDir, 'package.json');
      if (!fs.existsSync(renderPkgJson)) {
        fs.writeFileSync(renderPkgJson, JSON.stringify({ name: 'axis-render-template', version: '1.0.0', private: true }, null, 2));
      }

      // Safety net: ensure cwd is user-writable userData
      try {
        process.chdir(userData);
      } catch (e) {
        console.warn('Could not chdir to userData in render handler:', e);
      }

      // If multi-file project, write all files preserving subdirectories
      let resolvedEntry = 'UserCode.tsx';
      if (files && Array.isArray(files) && files.length > 0) {
        for (const f of files) {
          if (!f || !f.path) continue;
          const fullPath = path.join(renderTemplateDir, f.path);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, f.content || '');
        }
        resolvedEntry = entryFile || files[0].path;
      } else if (code) {
        fs.writeFileSync(path.join(renderTemplateDir, 'UserCode.tsx'), code);
        resolvedEntry = 'UserCode.tsx';
      }

      fs.writeFileSync(path.join(renderTemplateDir, 'settings.json'), JSON.stringify(settings, null, 2));

      // Create isolated server harness that never overwrites user Root.tsx or index.ts
      const importRel = resolvedEntry.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\.(tsx|ts|jsx|js)$/, '');
      const axisRootTsxPath = path.join(renderTemplateDir, '_axis_root.tsx');
      const axisEntryTsPath = path.join(renderTemplateDir, '_axis_entry.ts');

      const axisRootTsx = `import React from 'react';
import { Composition } from 'remotion';
import * as UserEntry from './${importRel}';
import settings from './settings.json';

let Target: any = (UserEntry as any).default || UserEntry;
if (Target && typeof Target === 'object') {
  const fnKeys = Object.keys(Target).filter(k => typeof Target[k] === 'function');
  const preferred = fnKeys.find(k => k.toLowerCase().includes('remotionroot') || k.toLowerCase().includes('root'))
    || fnKeys[0];
  if (preferred) Target = Target[preferred];
}

export const AxisMasterRoot: React.FC = () => {
  // If user defined a Remotion root that returns <Composition ...> (like RemotionRoot in Root.tsx)
  if (typeof Target === 'function') {
    try {
      const el = Target({});
      if (React.isValidElement(el)) {
        return el;
      }
    } catch (e) {}
  }

  const VisualWrapper: React.FC<any> = (props) => {
    if (typeof Target === 'function') {
      try {
        return React.createElement(Target, props);
      } catch (e) {
        console.error('Visual render error:', e);
      }
    }
    return React.createElement('div', { style: { color: 'white', backgroundColor: '#000', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, 'Rendering...');
  };

  return (
    <Composition
      id="AxisDefaultComposition"
      component={VisualWrapper}
      durationInFrames={settings.durationInFrames || 240}
      fps={settings.fps || 30}
      width={settings.width || 1920}
      height={settings.height || 1080}
    />
  );
};
`;

      const axisEntryTs = `import { registerRoot } from 'remotion';\nimport { AxisMasterRoot } from './_axis_root';\n\nregisterRoot(AxisMasterRoot);\n`;

      fs.writeFileSync(axisRootTsxPath, axisRootTsx);
      fs.writeFileSync(axisEntryTsPath, axisEntryTs);

      const currentHash = JSON.stringify(files || code) + JSON.stringify(settings) + (entryFile || '');
      let bundleLocation = cachedBundleLocation;
      
      // 2. Explicit outDir inside userData/.remotion/bundle
      const bundleDir = path.join(remotionDir, 'bundle');
      if (!fs.existsSync(bundleDir)) {
        fs.mkdirSync(bundleDir, { recursive: true });
      }

      if (currentHash !== cachedCodeAndSettings || !cachedBundleLocation) {
        bundleLocation = await bundle({
          entryPoint: path.join(renderTemplateDir, '_axis_entry.ts'),
          rootDir: renderTemplateDir,
          outDir: bundleDir,
          enableCaching: false,
          webpackOverride: (config) => {
            if (!config.resolve) config.resolve = {};
            if (!config.resolve.modules) config.resolve.modules = ['node_modules'];
            const searchPaths = [
              path.join(renderTemplateDir, 'node_modules'),
              path.join(__dirname, '../node_modules'),
              path.join(__dirname, '../../node_modules')
            ];
            if ((process as any).resourcesPath) {
              searchPaths.push(path.join((process as any).resourcesPath, 'app.asar.unpacked', 'server', 'node_modules'));
              searchPaths.push(path.join((process as any).resourcesPath, 'app.asar.unpacked', 'node_modules'));
            }
            config.resolve.modules.push(...searchPaths.filter(p => fs.existsSync(p)));
            return config;
          },
        });
        cachedBundleLocation = bundleLocation;
        cachedCodeAndSettings = currentHash;
      }

      const binariesDir = getCompositorBinariesDir();
      if (binariesDir) {
        console.log('Using unpacked compositor binariesDirectory:', binariesDir);
      }

      const compositions = await getCompositions(bundleLocation, {
        binariesDirectory: binariesDir,
      });
      console.log('Available compositions from bundle:', compositions.map(c => c.id));
      if (!compositions || compositions.length === 0) {
        throw new Error('No compositions found in project bundle.');
      }
      const composition = compositions.find(c => c.id !== 'AxisDefaultComposition') || compositions[0];
      console.log(`Selected composition '${composition.id}' (${composition.width}x${composition.height}, ${composition.durationInFrames} frames @ ${composition.fps}fps)`);

      const outputLocation = path.join(publicDir, `out_${renderId}.mp4`);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      let startTime = Date.now();

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation,
        binariesDirectory: binariesDir,
        concurrency: Math.max(2, Math.min(os.cpus().length || 4, 8)),
        imageFormat: 'jpeg',
        jpegQuality: isDraft ? 60 : 90,
        crf: isDraft ? 28 : 20,
        x264Preset: isDraft ? 'ultrafast' : 'faster',
        scale: isDraft ? 0.5 : 1,
        onProgress: ({ renderedFrames, progress, encodedFrames }) => {
          const timeElapsed = (Date.now() - startTime) / 1000;
          const currentFps = renderedFrames / timeElapsed;
          const totalFrames = composition.durationInFrames || settings.durationInFrames;
          const remainingFrames = totalFrames - renderedFrames;
          const etaSeconds = currentFps > 0 ? (remainingFrames / currentFps) : 0;
          
          renderProgress[renderId] = {
            status: 'rendering',
            progress,
            renderedFrames,
            totalFrames,
            encodedFrames,
            currentFps: currentFps.toFixed(1),
            eta: Math.max(0, Math.round(etaSeconds)) + 's'
          };
        },
      });

      let localExportPath: string | null = null;
      const targetFolder = exportDest || path.join(os.homedir(), 'Videos', 'Axis');
      try {
        const userFolder = path.isAbsolute(targetFolder)
          ? targetFolder
          : path.join(os.homedir(), targetFolder);
        if (!fs.existsSync(userFolder)) {
          fs.mkdirSync(userFolder, { recursive: true });
        }
        const cleanName = (entryFile || 'video').replace(/\.[^/.]+$/, '');
        const destFile = path.join(userFolder, `${cleanName}_${renderId}.mp4`);
        fs.copyFileSync(outputLocation, destFile);
        localExportPath = destFile;
        console.log(`Saved local export to: ${destFile}`);
      } catch (copyErr) {
        console.warn('Could not save copy to exportDest:', copyErr);
        localExportPath = outputLocation;
      }

      const host = req.get('host') || `localhost:${activePort}`;
      renderProgress[renderId] = {
        status: 'done',
        url: `http://${host}/out_${renderId}.mp4`,
        localPath: localExportPath,
      };

    } catch (error: any) {
      console.error(error);
      const outputLocation = path.join(publicDir, `out_${renderId}.mp4`);
      if (fs.existsSync(outputLocation)) {
        try {
          fs.unlinkSync(outputLocation);
        } catch (e) {}
      }
      renderProgress[renderId] = {
        status: 'error',
        error: error?.message || String(error)
      };
    }
  });

  app.use(express.static(publicDir));

  return new Promise<number>((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      activePort = (server.address() as any).port;
      console.log(`Server listening on 127.0.0.1:${activePort}`);
      resolve(activePort);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  const tDir = path.join(__dirname, '../../templates');
  const rtDir = path.join(__dirname, '../render-template/src');
  const pubDir = path.join(__dirname, '../public');
  startServer(3001, tDir, rtDir, pubDir);
}
