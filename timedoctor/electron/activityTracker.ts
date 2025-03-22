import { desktopCapturer, BrowserWindow } from 'electron';

export interface ActivityEntry {
  id: string;
  name: string;          // Application name
  title: string;         // Window title
  url?: string;          // For browser windows
  category: string;      // Productive, Unproductive, Neutral
  startTime: number;
  endTime?: number;
  duration?: number;
  type: 'application' | 'system' | 'browser';
  productivityScore: number; // 0-100
}

export interface ActivityStats {
  totalTime: number;
  productiveTime: number;
  unproductiveTime: number;
  neutralTime: number;
  averageProductivityScore: number;
  applicationBreakdown: { [key: string]: number };
  categoryBreakdown: { [key: string]: number };
}

export class ActivityTracker {
  private currentActivity: ActivityEntry | null = null;
  private activityHistory: ActivityEntry[] = [];
  private trackingInterval: NodeJS.Timeout | null = null;
  private isTracking = false;
  private isClockIn = false;

  // Predefined application categories
  private readonly applicationCategories: { [key: string]: { category: string; score: number } } = {
    // Development Tools
    'vite': { category: 'Development', score: 90 },
    'code': { category: 'Development', score: 90 },
    'vscode': { category: 'Development', score: 90 },
    'visual studio code': { category: 'Development', score: 90 },
    'terminal': { category: 'Development', score: 90 },
    'iterm': { category: 'Development', score: 90 },
    'git': { category: 'Development', score: 90 },
    'github': { category: 'Development', score: 90 },
    'postman': { category: 'Development', score: 85 },
    'intellij': { category: 'Development', score: 90 },
    'webstorm': { category: 'Development', score: 90 },
    'android studio': { category: 'Development', score: 90 },
    'xcode': { category: 'Development', score: 90 },

    // Browsers
    'chrome': { category: 'Browser', score: 50 },
    'firefox': { category: 'Browser', score: 50 },
    'safari': { category: 'Browser', score: 50 },
    'edge': { category: 'Browser', score: 50 },
    'opera': { category: 'Browser', score: 50 },
    'brave': { category: 'Browser', score: 50 },

    // Communication & Collaboration
    'slack': { category: 'Communication', score: 70 },
    'teams': { category: 'Communication', score: 70 },
    'zoom': { category: 'Communication', score: 80 },
    'discord': { category: 'Communication', score: 60 },
    'skype': { category: 'Communication', score: 70 },
    'outlook': { category: 'Communication', score: 75 },
    'mail': { category: 'Communication', score: 75 },

    // Productivity
    'excel': { category: 'Productivity', score: 85 },
    'word': { category: 'Productivity', score: 85 },
    'powerpoint': { category: 'Productivity', score: 85 },
    'numbers': { category: 'Productivity', score: 85 },
    'pages': { category: 'Productivity', score: 85 },
    'keynote': { category: 'Productivity', score: 85 },
    'notion': { category: 'Productivity', score: 85 },
    'evernote': { category: 'Productivity', score: 85 },

    // Design
    'figma': { category: 'Design', score: 85 },
    'sketch': { category: 'Design', score: 85 },
    'photoshop': { category: 'Design', score: 85 },
    'illustrator': { category: 'Design', score: 85 },
    'xd': { category: 'Design', score: 85 },
    'indesign': { category: 'Design', score: 85 },

    // Entertainment
    'spotify': { category: 'Entertainment', score: 20 },
    'netflix': { category: 'Entertainment', score: 10 },
    'youtube': { category: 'Entertainment', score: 30 },
    'vlc': { category: 'Entertainment', score: 20 },
    'music': { category: 'Entertainment', score: 20 },
    'photos': { category: 'Entertainment', score: 20 },
  };

  private readonly browserPatterns: { [key: string]: { category: string; score: number } } = {
    // Development & Documentation
    'github.com': { category: 'Development', score: 85 },
    'stackoverflow.com': { category: 'Development', score: 85 },
    'developer.mozilla.org': { category: 'Development', score: 90 },
    'docs.': { category: 'Development', score: 85 },

    // Productivity & Work
    'atlassian.': { category: 'Productivity', score: 80 },
    'trello.com': { category: 'Productivity', score: 80 },
    'asana.com': { category: 'Productivity', score: 80 },
    'notion.so': { category: 'Productivity', score: 80 },
    'google.com/docs': { category: 'Productivity', score: 80 },
    'sheets.google.com': { category: 'Productivity', score: 80 },
    'calendar.google': { category: 'Productivity', score: 80 },
    'meet.google': { category: 'Communication', score: 75 },

    // Communication
    'gmail.com': { category: 'Communication', score: 70 },
    'outlook.': { category: 'Communication', score: 70 },
    'slack.com': { category: 'Communication', score: 75 },
    'teams.microsoft.com': { category: 'Communication', score: 75 },
    'zoom.us': { category: 'Communication', score: 80 },

    // Social Media & Entertainment
    'facebook.com': { category: 'Social Media', score: 20 },
    'twitter.com': { category: 'Social Media', score: 20 },
    'instagram.com': { category: 'Social Media', score: 15 },
    'youtube.com': { category: 'Entertainment', score: 30 },
    'netflix.com': { category: 'Entertainment', score: 10 },
    'reddit.com': { category: 'Social Media', score: 25 },
  };

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private categorizeApplication(appName: string, windowTitle: string): { category: string; score: number } {
    // Convert to lowercase for matching
    const lowerAppName = appName.toLowerCase();
    const lowerTitle = windowTitle.toLowerCase();

    // First try exact matches
    for (const [key, value] of Object.entries(this.applicationCategories)) {
      if (lowerAppName === key || lowerTitle === key) {
        return value;
      }
    }

    // Then try partial matches
    for (const [key, value] of Object.entries(this.applicationCategories)) {
      if (lowerAppName.includes(key) || lowerTitle.includes(key)) {
        return value;
      }
    }

    // Special cases for browser URLs
    if (lowerTitle.includes('http://') || lowerTitle.includes('https://') || 
        lowerAppName.includes('browser') || lowerAppName.includes('chrome') || 
        lowerAppName.includes('firefox') || lowerAppName.includes('safari')) {
      return { category: 'Browser', score: 50 };
    }

    // Special cases for development
    if (lowerTitle.includes('.js') || lowerTitle.includes('.ts') || 
        lowerTitle.includes('.py') || lowerTitle.includes('.java') ||
        lowerTitle.includes('.html') || lowerTitle.includes('.css') ||
        lowerTitle.includes('.json') || lowerTitle.includes('git') ||
        lowerTitle.includes('npm') || lowerTitle.includes('node')) {
      return { category: 'Development', score: 90 };
    }

    // Default categorization
    return { category: 'Other', score: 50 };
  }

  private categorizeUrl(url: string): { category: string; score: number } {
    const lowerUrl = url.toLowerCase();
    
    // Check against browser patterns
    for (const [pattern, value] of Object.entries(this.browserPatterns)) {
      if (lowerUrl.includes(pattern)) {
        return value;
      }
    }

    // Special cases for development-related URLs
    if (lowerUrl.includes('localhost') || 
        lowerUrl.includes('127.0.0.1') ||
        lowerUrl.match(/:\d{4}/)) { // Common development ports
      return { category: 'Development', score: 90 };
    }

    // Default for unknown URLs
    return { category: 'Browser', score: 50 };
  }

  async trackActiveWindow() {
    if (!this.isClockIn) return;

    try {
      const sources = await desktopCapturer.getSources({ 
        types: ['window'],
        thumbnailSize: { width: 0, height: 0 }
      });

      // Filter out system windows and get the most recently active window
      const activeWindow = sources
        .filter(source => {
          return !source.name.toLowerCase().includes('entire screen') &&
                 !source.name.toLowerCase().includes('screen 1') &&
                 !source.name.toLowerCase().includes('desktop');
        })[0];

      if (!activeWindow) return;

      const now = Date.now();
      const windowName = activeWindow.name;
      let category = 'Other';  // Default category
      let score = 50;  // Default score
      let url: string | undefined;
      let type: 'application' | 'system' | 'browser' = 'application';

      // Check if it's a browser window
      const isBrowser = windowName.toLowerCase().match(/(chrome|firefox|safari|edge|brave|opera)/i);
      
      if (isBrowser) {
        type = 'browser';
        // Get all browser windows
        const allWindows = BrowserWindow.getAllWindows();
        for (const window of allWindows) {
          if (window.isFocused()) {
            try {
              url = window.webContents.getURL();
              const urlCategory = this.categorizeUrl(url);
              category = urlCategory.category;
              score = urlCategory.score;
              break;
            } catch (error) {
              console.error('Error getting URL:', error);
              // Fallback to default browser categorization
              ({ category, score } = this.categorizeApplication(windowName, windowName));
            }
          }
        }
        if (!url) {
          // Fallback if we couldn't get the URL
          ({ category, score } = this.categorizeApplication(windowName, windowName));
        }
      } else {
        // Non-browser window
        ({ category, score } = this.categorizeApplication(windowName, windowName));
      }

      const newActivity: ActivityEntry = {
        id: this.generateId(),
        name: windowName,
        title: windowName,
        url,
        category,
        startTime: now,
        type,
        productivityScore: score,
      };

      // If there's a change in activity
      if (!this.currentActivity || 
          this.currentActivity.name !== newActivity.name || 
          this.currentActivity.title !== newActivity.title ||
          this.currentActivity.url !== newActivity.url) {
        
        if (this.currentActivity) {
          this.currentActivity.endTime = now;
          this.currentActivity.duration = now - this.currentActivity.startTime;
          this.activityHistory.push(this.currentActivity);
        }

        this.currentActivity = newActivity;
      }
    } catch (error) {
      console.error('Error tracking active window:', error);
    }
  }

  startTracking() {
    this.isClockIn = true;
    if (this.isTracking) return;

    this.isTracking = true;
    this.trackingInterval = setInterval(() => {
      this.trackActiveWindow();
    }, 1000); // Track every second
  }

  stopTracking() {
    this.isClockIn = false;
    if (!this.isTracking) return;

    this.isTracking = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    // Close current activity if any
    if (this.currentActivity) {
      const now = Date.now();
      this.currentActivity.endTime = now;
      this.currentActivity.duration = now - this.currentActivity.startTime;
      this.activityHistory.push(this.currentActivity);
      this.currentActivity = null;
    }
  }

  getActivityHistory(): ActivityEntry[] {
    return this.activityHistory;
  }

  getCurrentActivity(): ActivityEntry | null {
    return this.currentActivity;
  }

  getStats(startTime?: number, endTime?: number): ActivityStats {
    const activities = startTime && endTime
      ? this.activityHistory.filter(a => a.startTime >= startTime && a.endTime! <= endTime)
      : this.activityHistory;

    const stats: ActivityStats = {
      totalTime: 0,
      productiveTime: 0,
      unproductiveTime: 0,
      neutralTime: 0,
      averageProductivityScore: 0,
      applicationBreakdown: {},
      categoryBreakdown: {},
    };

    let totalScore = 0;
    let totalActivities = 0;

    activities.forEach(activity => {
      const duration = activity.duration || 0;
      stats.totalTime += duration;

      // Update application breakdown
      stats.applicationBreakdown[activity.name] = 
        (stats.applicationBreakdown[activity.name] || 0) + duration;

      // Update category breakdown
      stats.categoryBreakdown[activity.category] = 
        (stats.categoryBreakdown[activity.category] || 0) + duration;

      // Update productivity metrics
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

    // Calculate average productivity score
    stats.averageProductivityScore = totalActivities > 0 
      ? totalScore / totalActivities 
      : 0;

    return stats;
  }

  clearHistory() {
    this.activityHistory = [];
    this.currentActivity = null;
  }

  // Add or update application category
  updateApplicationCategory(
    appName: string, 
    category: string, 
    score: number
  ) {
    this.applicationCategories[appName.toLowerCase()] = { category, score };
  }
}

export default ActivityTracker; 