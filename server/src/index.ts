import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const templatesDir = path.join(__dirname, '../../templates');
const renderTemplateDir = path.join(__dirname, '../render-template/src');

// Progress tracking
const renderProgress: Record<string, any> = {};

// Bundle Cache
let cachedBundleLocation = '';
let cachedCodeAndSettings = '';

app.get('/api/templates', (req, res) => {
  try {
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
  const { code, settings, isDraft } = req.body;
  if (!code || !settings) return res.status(400).json({ error: 'Code and settings required' });

  const renderId = Date.now().toString();
  renderProgress[renderId] = { status: 'bundling', progress: 0, fps: 0, eta: '' };

  // Return renderId immediately so client can start polling
  res.json({ renderId });

  try {
    fs.writeFileSync(path.join(renderTemplateDir, 'UserCode.tsx'), code);
    fs.writeFileSync(path.join(renderTemplateDir, 'settings.json'), JSON.stringify(settings, null, 2));

    const currentHash = code + JSON.stringify(settings);
    let bundleLocation = cachedBundleLocation;
    
    if (currentHash !== cachedCodeAndSettings || !cachedBundleLocation) {
      bundleLocation = await bundle({
        entryPoint: path.join(__dirname, '../render-template/src/index.ts'),
        webpackOverride: (config) => config,
      });
      cachedBundleLocation = bundleLocation;
      cachedCodeAndSettings = currentHash;
    }

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'UserComposition',
    });

    const outputLocation = path.join(__dirname, `../public/out_${renderId}.mp4`);
    if (!fs.existsSync(path.join(__dirname, '../public'))) {
      fs.mkdirSync(path.join(__dirname, '../public'));
    }

    let startTime = Date.now();

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation,
      concurrency: Math.min(os.cpus().length, 8),
      imageFormat: 'jpeg',
      jpegQuality: isDraft ? 60 : 90,
      crf: isDraft ? undefined : 18,
      x264Preset: isDraft ? 'ultrafast' : 'veryfast',
      scale: isDraft ? 0.5 : 1,
      onProgress: ({ renderedFrames, renderedDoneIn, progress, encodedFrames }) => {
        const timeElapsed = (Date.now() - startTime) / 1000;
        const currentFps = renderedFrames / timeElapsed;
        const totalFrames = settings.durationInFrames;
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

    renderProgress[renderId] = {
      status: 'done',
      url: `http://localhost:3001/out_${renderId}.mp4`
    };

  } catch (error: any) {
    console.error(error);
    const outputLocation = path.join(__dirname, `../public/out_${renderId}.mp4`);
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

app.use(express.static(path.join(__dirname, '../public')));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
