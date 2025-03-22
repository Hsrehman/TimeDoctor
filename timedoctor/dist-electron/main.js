var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { desktopCapturer, ipcMain, app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __filename = fileURLToPath(import.meta.url);
path.dirname(__filename);
class ActivityTracker {
  constructor() {
    __publicField(this, "currentActivity", null);
    __publicField(this, "activityHistory", []);
    __publicField(this, "trackingInterval", null);
    __publicField(this, "isTracking", false);
    __publicField(this, "isClockIn", false);
    // Predefined application categories
    __publicField(this, "applicationCategories", {
      // Development Tools
      "vite": { category: "Development", score: 90 },
      "code": { category: "Development", score: 90 },
      "vscode": { category: "Development", score: 90 },
      "visual studio code": { category: "Development", score: 90 },
      "terminal": { category: "Development", score: 90 },
      "iterm": { category: "Development", score: 90 },
      "git": { category: "Development", score: 90 },
      "github": { category: "Development", score: 90 },
      "postman": { category: "Development", score: 85 },
      "intellij": { category: "Development", score: 90 },
      "webstorm": { category: "Development", score: 90 },
      "android studio": { category: "Development", score: 90 },
      "xcode": { category: "Development", score: 90 },
      // Browsers
      "chrome": { category: "Browser", score: 50 },
      "firefox": { category: "Browser", score: 50 },
      "safari": { category: "Browser", score: 50 },
      "edge": { category: "Browser", score: 50 },
      "opera": { category: "Browser", score: 50 },
      "brave": { category: "Browser", score: 50 },
      // Communication & Collaboration
      "slack": { category: "Communication", score: 70 },
      "teams": { category: "Communication", score: 70 },
      "zoom": { category: "Communication", score: 80 },
      "discord": { category: "Communication", score: 60 },
      "skype": { category: "Communication", score: 70 },
      "outlook": { category: "Communication", score: 75 },
      "mail": { category: "Communication", score: 75 },
      // Productivity
      "excel": { category: "Productivity", score: 85 },
      "word": { category: "Productivity", score: 85 },
      "powerpoint": { category: "Productivity", score: 85 },
      "numbers": { category: "Productivity", score: 85 },
      "pages": { category: "Productivity", score: 85 },
      "keynote": { category: "Productivity", score: 85 },
      "notion": { category: "Productivity", score: 85 },
      "evernote": { category: "Productivity", score: 85 },
      // Design
      "figma": { category: "Design", score: 85 },
      "sketch": { category: "Design", score: 85 },
      "photoshop": { category: "Design", score: 85 },
      "illustrator": { category: "Design", score: 85 },
      "xd": { category: "Design", score: 85 },
      "indesign": { category: "Design", score: 85 },
      // Entertainment
      "spotify": { category: "Entertainment", score: 20 },
      "netflix": { category: "Entertainment", score: 10 },
      "youtube": { category: "Entertainment", score: 30 },
      "vlc": { category: "Entertainment", score: 20 },
      "music": { category: "Entertainment", score: 20 },
      "photos": { category: "Entertainment", score: 20 }
    });
  }
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
  categorizeApplication(appName, windowTitle) {
    const lowerAppName = appName.toLowerCase();
    const lowerTitle = windowTitle.toLowerCase();
    for (const [key, value] of Object.entries(this.applicationCategories)) {
      if (lowerAppName === key || lowerTitle === key) {
        return value;
      }
    }
    for (const [key, value] of Object.entries(this.applicationCategories)) {
      if (lowerAppName.includes(key) || lowerTitle.includes(key)) {
        return value;
      }
    }
    if (lowerTitle.includes("http://") || lowerTitle.includes("https://") || lowerAppName.includes("browser") || lowerAppName.includes("chrome") || lowerAppName.includes("firefox") || lowerAppName.includes("safari")) {
      return { category: "Browser", score: 50 };
    }
    if (lowerTitle.includes(".js") || lowerTitle.includes(".ts") || lowerTitle.includes(".py") || lowerTitle.includes(".java") || lowerTitle.includes(".html") || lowerTitle.includes(".css") || lowerTitle.includes(".json") || lowerTitle.includes("git") || lowerTitle.includes("npm") || lowerTitle.includes("node")) {
      return { category: "Development", score: 90 };
    }
    return { category: "Other", score: 50 };
  }
  async trackActiveWindow() {
    if (!this.isClockIn) return;
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window"],
        // Only track windows, not the entire screen
        thumbnailSize: { width: 0, height: 0 }
      });
      const activeWindow = sources.filter((source) => {
        return !source.name.toLowerCase().includes("entire screen") && !source.name.toLowerCase().includes("screen 1") && !source.name.toLowerCase().includes("desktop");
      })[0];
      if (!activeWindow) return;
      const now = Date.now();
      const { category, score } = this.categorizeApplication(
        activeWindow.name,
        activeWindow.name
      );
      const newActivity = {
        id: this.generateId(),
        name: activeWindow.name,
        title: activeWindow.name,
        category,
        startTime: now,
        type: "application",
        productivityScore: score
      };
      if (!this.currentActivity || this.currentActivity.name !== newActivity.name || this.currentActivity.title !== newActivity.title) {
        if (this.currentActivity) {
          this.currentActivity.endTime = now;
          this.currentActivity.duration = now - this.currentActivity.startTime;
          this.activityHistory.push(this.currentActivity);
        }
        this.currentActivity = newActivity;
      }
    } catch (error) {
      console.error("Error tracking active window:", error);
    }
  }
  startTracking() {
    this.isClockIn = true;
    if (this.isTracking) return;
    this.isTracking = true;
    this.trackingInterval = setInterval(() => {
      this.trackActiveWindow();
    }, 1e3);
  }
  stopTracking() {
    this.isClockIn = false;
    if (!this.isTracking) return;
    this.isTracking = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    if (this.currentActivity) {
      const now = Date.now();
      this.currentActivity.endTime = now;
      this.currentActivity.duration = now - this.currentActivity.startTime;
      this.activityHistory.push(this.currentActivity);
      this.currentActivity = null;
    }
  }
  getActivityHistory() {
    return this.activityHistory;
  }
  getCurrentActivity() {
    return this.currentActivity;
  }
  getStats(startTime, endTime) {
    const activities = startTime && endTime ? this.activityHistory.filter((a) => a.startTime >= startTime && a.endTime <= endTime) : this.activityHistory;
    const stats = {
      totalTime: 0,
      productiveTime: 0,
      unproductiveTime: 0,
      neutralTime: 0,
      averageProductivityScore: 0,
      applicationBreakdown: {},
      categoryBreakdown: {}
    };
    let totalScore = 0;
    let totalActivities = 0;
    activities.forEach((activity) => {
      const duration = activity.duration || 0;
      stats.totalTime += duration;
      stats.applicationBreakdown[activity.name] = (stats.applicationBreakdown[activity.name] || 0) + duration;
      stats.categoryBreakdown[activity.category] = (stats.categoryBreakdown[activity.category] || 0) + duration;
      if (activity.productivityScore >= 75) {
        stats.productiveTime += duration;
      } else if (activity.productivityScore <= 25) {
        stats.unproductiveTime += duration;
      } else {
        stats.neutralTime += duration;
      }
      totalScore += activity.productivityScore;
      totalActivities++;
    });
    stats.averageProductivityScore = totalActivities > 0 ? totalScore / totalActivities : 0;
    return stats;
  }
  clearHistory() {
    this.activityHistory = [];
    this.currentActivity = null;
  }
  // Add or update application category
  updateApplicationCategory(appName, category, score) {
    this.applicationCategories[appName.toLowerCase()] = { category, score };
  }
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let mainWindow = null;
const INACTIVITY_THRESHOLD = 5e4;
let isUserActive = true;
let isClockIn = false;
let activityCheckInterval = null;
let lastActivityTime = Date.now();
const activityTracker = new ActivityTracker();
ipcMain.handle("get-activity-history", () => {
  return activityTracker.getActivityHistory();
});
ipcMain.handle("get-current-activity", () => {
  return activityTracker.getCurrentActivity();
});
ipcMain.handle("get-activity-stats", (_, startTime, endTime) => {
  return activityTracker.getStats(startTime, endTime);
});
ipcMain.on("clear-activity-history", () => {
  activityTracker.clearHistory();
});
ipcMain.on("update-app-category", (_, appName, category, score) => {
  activityTracker.updateApplicationCategory(appName, category, score);
});
function startActivityMonitoring(window) {
  lastActivityTime = Date.now();
  isUserActive = true;
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
  }
  if (isClockIn) {
    activityTracker.startTracking();
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
      contextIsolation: false,
      webSecurity: false
    }
  });
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ["media", "display-capture", "window-placement"];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return ["media", "display-capture", "window-placement"].includes(permission);
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
      activityTracker.stopTracking();
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
