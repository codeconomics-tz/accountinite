import { app, Notification } from 'electron';
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer';
import { Main } from '../main';
import { rendererLog } from './helpers';
import { emitMainProcessError } from 'backend/helpers';
import { IPC_MESSAGES } from '../utils/messages';

export default function registerAppLifecycleListeners(main: Main) {
  app.on('window-all-closed', () => {
    // On macOS, keep the default behavior (don't quit when window is closed)
    if (process.platform === 'darwin') {
      app.quit();
    } else {
      // For Windows and Linux, we handle the close event at the window level
      // So when all windows are closed, we can quit the app
      app.quit();
    }
  });

  app.on('activate', () => {
    if (main.mainWindow === null) {
      main.createWindow().catch((err) => emitMainProcessError(err));
    }
  });

  app.on('ready', () => {
    if (main.isDevelopment && !main.isTest) {
      installDevTools(main).catch((err) => emitMainProcessError(err));
    }

    main.createWindow().catch((err) => emitMainProcessError(err));
  });
}

async function installDevTools(main: Main) {
  try {
    await installExtension(VUEJS3_DEVTOOLS);
  } catch (e) {
    rendererLog(main, 'Vue Devtools failed to install', e);
  }
}