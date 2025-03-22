import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ActivityTracker from './activityTracker'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let mainWindow: BrowserWindow | null = null
const INACTIVITY_THRESHOLD = 50000; // 50 seconds
let isUserActive = true
let isClockIn = false
let activityCheckInterval: NodeJS.Timeout | null = null
let lastActivityTime = Date.now()

// Initialize activity tracker
const activityTracker = new ActivityTracker();

// Set up IPC handlers for activity tracking
ipcMain.handle('get-activity-history', () => {
  return activityTracker.getActivityHistory();
});

ipcMain.handle('get-current-activity', () => {
  return activityTracker.getCurrentActivity();
});

ipcMain.handle('get-activity-stats', (_, startTime?: number, endTime?: number) => {
  return activityTracker.getStats(startTime, endTime);
});

ipcMain.on('clear-activity-history', () => {
  activityTracker.clearHistory();
});

ipcMain.on('update-app-category', (_, appName: string, category: string, score: number) => {
  activityTracker.updateApplicationCategory(appName, category, score);
});

function startActivityMonitoring(window: BrowserWindow) {
  lastActivityTime = Date.now()
  isUserActive = true  // Reset to active state when monitoring starts
  
  // Clear existing interval if any
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval)
  }

  // Start activity tracking if clocked in
  if (isClockIn) {
    activityTracker.startTracking();
  }

  // Start checking for inactivity immediately
  activityCheckInterval = setInterval(() => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityTime

    if (timeSinceLastActivity >= INACTIVITY_THRESHOLD && isUserActive && isClockIn) {
      isUserActive = false
      window.webContents.send('activity-status-changed', false)
    }
  }, 1000)
}

function handleUserActivity(event?: { type: string, key?: string }) {
  const now = Date.now();
  lastActivityTime = now;

  // Only handle spacebar press when inactive
  if (!isUserActive && mainWindow && event?.type === 'keyDown' && event.key === ' ') {
    isUserActive = true;
    // Send resume event instead of just activity status
    mainWindow.webContents.send('resume-activity');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  })

  // Enable screen capture permission
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'display-capture', 'window-placement'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Enable screen capture
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return ['media', 'display-capture', 'window-placement'].includes(permission);
  });

  // Test active push message to Renderer-process.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      startActivityMonitoring(mainWindow)
    }
  })

  // Set up IPC handlers
  ipcMain.on('clock-status-changed', (_, clockedIn) => {
    isClockIn = clockedIn;
    if (!clockedIn && activityCheckInterval) {
      clearInterval(activityCheckInterval);
      activityCheckInterval = null;
      activityTracker.stopTracking();
    } else if (clockedIn && mainWindow) {
      startActivityMonitoring(mainWindow);
    }
  });

  ipcMain.on('start-monitoring', () => {
    if (mainWindow && isClockIn) {
      startActivityMonitoring(mainWindow);
    }
  });

  // Set up activity monitoring
  mainWindow.on('focus', () => {
    if (isClockIn) {
      mainWindow?.webContents.send('window-focus-update', true);
    }
  });

  mainWindow.on('blur', () => {
    if (isClockIn) {
      mainWindow?.webContents.send('window-focus-update', false);
    }
  });

  // Monitor keyboard activity
  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (isClockIn) {
      handleUserActivity({ type: input.type, key: input.key });
    }
  });

  // Monitor mouse movement
  mainWindow.webContents.on('input-event', (_, event) => {
    if (event.type === 'mouseMove' && isClockIn) {
      lastActivityTime = Date.now();
    }
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

