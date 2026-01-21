import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  ipcMain,
  protocol,
  ProtocolRequest,
  ProtocolResponse,
  screen,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'fs';
import path from 'path';
import registerAppLifecycleListeners from './main/registerAppLifecycleListeners';
import registerAutoUpdaterListeners from './main/registerAutoUpdaterListeners';
import registerIpcMainActionListeners from './main/registerIpcMainActionListeners';
import registerIpcMainMessageListeners from './main/registerIpcMainMessageListeners';
import registerProcessListeners from './main/registerProcessListeners';
import { emitMainProcessError } from 'backend/helpers';
import { IPC_MESSAGES } from './utils/messages';
import 'dotenv/config';

export class Main {
  title = 'Accountinite';
  icon: string;
  winURL = '';
  checkedForUpdate = false;
  mainWindow: BrowserWindow | null = null;
  MIN_WIDTH = 800;
  MIN_HEIGHT = 600;
  DEFAULT_WIDTH = 1200;
  DEFAULT_HEIGHT = process.platform === 'win32' ? 826 : 800;

  constructor() {
    console.log('Starting Accountinite app...');

    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });
    
    this.icon = this.isDevelopment
      ? path.resolve('./build/icon.png')
      : path.join(__dirname, 'icons', '512x512.png');

    protocol.registerSchemesAsPrivileged([
      { scheme: 'app', privileges: { secure: true, standard: true } },
    ]);

    if (this.isDevelopment) {
      autoUpdater.logger = console;
    }

    // Set app ID for Windows notifications
    if (process.platform === 'win32') {
      app.setAppUserModelId('io.accountinite');
    }

    app.commandLine.appendSwitch('disable-http2');
    autoUpdater.requestHeaders = {
      'Cache-Control':
        'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    };

    this.registerListeners();


    app
      .whenReady()
      .then(() => this.createWindow())
      .catch((error) => {
        emitMainProcessError(error);
        app.exit(1);
      });

    // Handle window-all-closed event in registerAppLifecycleListeners.ts
    // app.on('window-all-closed', () => {
    //   app.quit();
    // });
  }

  get isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  get isTest() {
    return !!process.env.IS_TEST;
  }

  get isLinux() {
    return process.platform === 'linux';
  }

  registerListeners() {
    registerIpcMainMessageListeners(this);
    registerIpcMainActionListeners(this);
    registerAutoUpdaterListeners(this);
    registerAppLifecycleListeners(this);
    registerProcessListeners(this);
  }

  getOptions(): BrowserWindowConstructorOptions {
    const preload = path.join(__dirname, 'main', 'preload.js');
    
    // Get the primary display information
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;
    
    // Calculate window dimensions based on screen size, but not exceeding defaults
    let windowWidth = Math.min(this.DEFAULT_WIDTH, screenWidth * 0.8);
    let windowHeight = Math.min(this.DEFAULT_HEIGHT, screenHeight * 0.8);
    
    // Ensure minimum dimensions are respected
    windowWidth = Math.max(windowWidth, this.MIN_WIDTH);
    windowHeight = Math.max(windowHeight, this.MIN_HEIGHT);
    
    return {
      width: windowWidth,
      height: windowHeight,
      minWidth: this.MIN_WIDTH,
      minHeight: this.MIN_HEIGHT,
      title: this.title,
      titleBarStyle: 'hidden',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        preload,
      },
      autoHideMenuBar: true,
      frame: false,
      resizable: true,
      icon: this.icon,
    };
  }

  async createWindow() {
    if (this.mainWindow) return;

    this.mainWindow = new BrowserWindow(this.getOptions());

    if (this.isDevelopment) {
      this.setViteServerURL();
    } else {
      this.registerAppProtocol();
      // Disable dev tools in production
      this.mainWindow.webContents.on('devtools-opened', () => {
        this.mainWindow?.webContents.closeDevTools();
      });
      
      // Prevent dev tools from being opened via keyboard shortcuts
      this.mainWindow.webContents.on('before-input-event', (event, input) => {
        if (
          input.code === 'F12' || 
          (input.control && input.shift && input.key.toLowerCase() === 'i') ||
          (input.meta && input.alt && input.key.toLowerCase() === 'i')
        ) {
          event.preventDefault();
        }
      });
    }

    await this.mainWindow.loadURL(this.winURL);

    if (this.isDevelopment && !this.isTest) {
      this.mainWindow.webContents.openDevTools();
    } else if (!this.isDevelopment) {
      this.mainWindow.webContents.on('devtools-opened', () => {
        this.mainWindow?.webContents.closeDevTools();
      });
    }

    // Handle window close event to show in-app notification before closing
    let shouldClose = false;
    
    this.mainWindow.on('close', (event) => {
      if (!shouldClose) {
        // Prevent the default close behavior
        event.preventDefault();
        
        // Send a message to the renderer to handle the close event
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_MESSAGES.HANDLE_APP_CLOSE);
        }
      }
      // If shouldClose is true, the event will proceed normally
    });
    
    // Add a method to allow closing the window from renderer
    ipcMain.on(IPC_MESSAGES.ALLOW_WINDOW_CLOSE, () => {
      if (this.mainWindow) {
        shouldClose = true;
        this.mainWindow.close();
      }
    });
    
    this.mainWindow.on('closed', () => (this.mainWindow = null));
    this.mainWindow.webContents.on('did-fail-load', () => {
      this.mainWindow?.loadURL(this.winURL).catch(emitMainProcessError);
    });
  }

  setViteServerURL() {
    const host = process.env.VITE_HOST || '127.0.0.1';
    const port = process.env.VITE_PORT || '6970';
    this.winURL = `http://${host}:${port}/`;
  }

  registerAppProtocol() {
    protocol.registerBufferProtocol('app', bufferProtocolCallback);
    this.winURL = 'app://./index.html';
  }
}

function bufferProtocolCallback(
  request: ProtocolRequest,
  callback: (response: ProtocolResponse) => void
) {
  const { pathname, host } = new URL(request.url);
  const filePath = path.join(
    __dirname,
    'src',
    decodeURI(host),
    decodeURI(pathname)
  );

  fs.readFile(filePath, (_, data) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType =
      {
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
      }[ext] || '';

    callback({ mimeType, data });
  });
}

export default new Main();

//OYAH!