'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const http = require('http');
const fs = require('fs');
const url = require('url');

let mainWindow = null;
let splashWindow = null;
let springBootProcess = null;
let fileServer = null;

const BACKEND_PORT = 8080;
const FRONTEND_PORT = 3000;

const isDev = !app.isPackaged;

// --- Path resolution ---
const javaExe = (() => {
  if (isDev) return 'java';
  const jreBase = path.join(process.resourcesPath, 'jre', 'bin');
  return process.platform === 'win32'
    ? path.join(jreBase, 'java.exe')
    : path.join(jreBase, 'java');
})();

const jarPath = isDev
  ? path.join(__dirname, '..', '..', 'Backend', 'docs-evaluator', 'target', 'docs-evaluator-0.0.1-SNAPSHOT.jar')
  : path.join(process.resourcesPath, 'app.jar');

const distPath = isDev
  ? path.join(__dirname, '..', 'dist')
  : path.join(process.resourcesPath, 'dist');

// --- Splash screen ---
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2e 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    overflow: hidden;
  }
  .logo { font-size: 52px; margin-bottom: 16px; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 6px; letter-spacing: 0.3px; }
  .subtitle { font-size: 13px; opacity: 0.6; margin-bottom: 36px; }
  .bar-wrap {
    width: 320px; height: 4px;
    background: rgba(255,255,255,0.12);
    border-radius: 4px;
    overflow: hidden;
  }
  .bar {
    height: 100%; width: 0%;
    background: linear-gradient(90deg, #4fc3f7, #81d4fa);
    border-radius: 4px;
    animation: load 60s ease-out forwards;
  }
  @keyframes load {
    0%   { width: 0%; }
    10%  { width: 15%; }
    30%  { width: 45%; }
    60%  { width: 70%; }
    85%  { width: 85%; }
    100% { width: 92%; }
  }
  .status { margin-top: 18px; font-size: 12px; opacity: 0.45; }
</style>
</head>
<body>
  <div class="logo">✨</div>
  <h1>IEEE Docs Evaluator</h1>
  <p class="subtitle">Starting backend services…</p>
  <div class="bar-wrap"><div class="bar"></div></div>
  <div class="status">Please wait while the server starts up</div>
</body>
</html>`;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// --- Main application window ---
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// --- Static file server for built React app ---
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

function startFileServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url);
      let filePath = path.join(distPath, parsedUrl.pathname);

      // SPA fallback — serve index.html for unknown routes
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distPath, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });

    server.listen(FRONTEND_PORT, '127.0.0.1', () => {
      fileServer = server;
      resolve();
    });

    server.on('error', reject);
  });
}

// --- Spring Boot launcher ---
function startSpringBoot() {
  console.log(`[Electron] Launching JAR: ${jarPath}`);
  console.log(`[Electron] Java binary: ${javaExe}`);

  springBootProcess = spawn(javaExe, ['-jar', jarPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  springBootProcess.stdout.on('data', (data) => {
    console.log('[Spring Boot]', data.toString().trimEnd());
  });

  springBootProcess.stderr.on('data', (data) => {
    console.error('[Spring Boot]', data.toString().trimEnd());
  });

  springBootProcess.on('error', (err) => {
    console.error('[Electron] Failed to start Spring Boot:', err.message);
  });
}

// --- Wait until a TCP port accepts connections ---
function waitForPort(port, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(1500);

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      const retry = () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port} after ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 1000);
        }
      };

      socket.once('timeout', retry);
      socket.once('error', retry);
      socket.connect(port, '127.0.0.1');
    };

    attempt();
  });
}

// --- Cleanup child processes on exit ---
function cleanup() {
  if (fileServer) {
    fileServer.close();
    fileServer = null;
  }
  if (springBootProcess) {
    springBootProcess.kill();
    springBootProcess = null;
  }
}

// --- App lifecycle ---
app.whenReady().then(async () => {
  createSplashWindow();

  try {
    await startFileServer();
    console.log(`[Electron] React file server started on port ${FRONTEND_PORT}`);

    startSpringBoot();
    console.log(`[Electron] Waiting for Spring Boot on port ${BACKEND_PORT}…`);

    await waitForPort(BACKEND_PORT);
    console.log('[Electron] Spring Boot is ready — opening main window');

    createMainWindow();
  } catch (err) {
    console.error('[Electron] Startup failed:', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', cleanup);

app.on('activate', () => {
  if (mainWindow === null && splashWindow === null) {
    createMainWindow();
  }
});

// --- IPC: open OAuth URL in system browser (for future use) ---
ipcMain.handle('oauth:start', async (_event, oauthUrl) => {
  await shell.openExternal(oauthUrl);
});

// --- IPC: save PDFs to a user-selected folder ---
ipcMain.handle('pdfs:save', async (_event, files) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select folder to save PDFs',
    properties: ['openDirectory'],
  });

  if (result.canceled || !result.filePaths.length) return { canceled: true };

  const destDir = result.filePaths[0];
  for (const { name, dataUrl } of files) {
    const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(path.join(destDir, name), Buffer.from(base64, 'base64'));
  }
  return { savedTo: destDir, count: files.length };
});
