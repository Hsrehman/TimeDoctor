import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let mainWindow = null;
const INACTIVITY_THRESHOLD = 5e3;
let isUserActive = true;
let isClockIn = false;
let activityCheckInterval = null;
let lastActivityTime = Date.now();
function startActivityMonitoring(window) {
  lastActivityTime = Date.now();
  isUserActive = true;
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
  }
  activityCheckInterval = setInterval(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;
    if (timeSinceLastActivity >= INACTIVITY_THRESHOLD && isUserActive && isClockIn) {
      isUserActive = false;
      window.webContents.send("activity-status-changed", false);
    }
  }, 1e3);
}
function handleUserActivity(event) {
  const now = Date.now();
  lastActivityTime = now;
  if (!isUserActive && mainWindow && (event == null ? void 0 : event.type) === "keyDown" && event.key === " ") {
    isUserActive = true;
    mainWindow.webContents.send("resume-activity");
  }
}
function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  mainWindow.on("ready-to-show", () => {
    if (mainWindow) {
      startActivityMonitoring(mainWindow);
    }
  });
  ipcMain.on("clock-status-changed", (_, clockedIn) => {
    isClockIn = clockedIn;
    if (!clockedIn && activityCheckInterval) {
      clearInterval(activityCheckInterval);
      activityCheckInterval = null;
    } else if (clockedIn && mainWindow) {
      startActivityMonitoring(mainWindow);
    }
  });
  ipcMain.on("start-monitoring", () => {
    if (mainWindow && isClockIn) {
      startActivityMonitoring(mainWindow);
    }
  });
  mainWindow.on("focus", () => {
    if (isClockIn) {
      mainWindow == null ? void 0 : mainWindow.webContents.send("window-focus-update", true);
    }
  });
  mainWindow.on("blur", () => {
    if (isClockIn) {
      mainWindow == null ? void 0 : mainWindow.webContents.send("window-focus-update", false);
    }
  });
  mainWindow.webContents.on("before-input-event", (_, input) => {
    if (isClockIn) {
      handleUserActivity({ type: input.type, key: input.key });
    }
  });
  mainWindow.webContents.on("input-event", (_, event) => {
    if (event.type === "mouseMove" && isClockIn) {
      lastActivityTime = Date.now();
    }
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    mainWindow = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
