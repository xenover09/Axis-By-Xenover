const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://localhost:3001/api';

async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runCheck() {
  console.log('Starting E2E check...');
  
  // 1. Fetch templates
  const { templates } = await fetchJson(`${API_URL}/templates`);
  console.log('Found templates:', templates);
  
  if (!templates || templates.length === 0) {
    throw new Error('No templates found');
  }

  // 2. For the first template, do a short render (3 secs = 90 frames at 30fps)
  const templateId = templates[0];
  console.log(`Loading template: ${templateId}`);
  const code = await fetchText(`${API_URL}/templates/${templateId}`);
  
  if (!code || code.length === 0) {
    throw new Error(`Template ${templateId} code is empty`);
  }
  console.log(`Template code loaded, size: ${code.length} bytes`);
  
  const settings = {
    fps: 30,
    durationInFrames: 90, // 3 seconds
    width: 640, // Small for fast render
    height: 360
  };
  
  console.log(`Requesting render for ${templateId}...`);
  const postData = JSON.stringify({ code, settings });
  
  const renderRes = await fetchJson(`${API_URL}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    body: postData
  });
  
  console.log('Render response:', renderRes);
  if (renderRes.url) {
    console.log('E2E Check SUCCESS!');
  } else {
    throw new Error('Render failed: ' + renderRes.error);
  }
}

runCheck().catch(err => {
  console.error('E2E Check FAILED:', err);
  process.exit(1);
});
