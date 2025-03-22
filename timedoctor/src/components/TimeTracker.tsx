import { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import './TimeTracker.css';
import BreakDialog from './BreakDialog';
import InactivityDialog from './InactivityDialog';
import ActivityDashboard from './ActivityDashboard';

interface TimeStats {
  workTime: number;
  normalBreakTime: number;
  officeBreakTime: number;
  inactiveTime: number;
  sessionTime: number;
  payableTime: number;
}

interface TimelineEntry {
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'inactivity_start' | 'inactivity_end';
  timestamp: Date;
  description?: string;
}

type TimeTrackerState = 'working' | 'normal_break' | 'office_break' | 'inactive' | 'not_working';

const TimeTracker = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [timeStats, setTimeStats] = useState<TimeStats>({
    workTime: 0,
    normalBreakTime: 0,
    officeBreakTime: 0,
    inactiveTime: 0,
    sessionTime: 0,
    payableTime: 0,
  });
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [currentState, setCurrentState] = useState<TimeTrackerState>('not_working');
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [breakEndTime, setBreakEndTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showInactivityDialog, setShowInactivityDialog] = useState(false);
  const [inactiveTime, setInactiveTime] = useState(0);
  const [inactivityStartTime, setInactivityStartTime] = useState<number | null>(null);

  // Format time in hours, minutes and seconds based on duration
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${remainingSeconds.toString().padStart(2, '0')}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatTimeWithSeconds = (date: Date): string => {
    // Format to show hh:mm:ss AM/PM
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds} ${ampm}`;
  };

  const formatBreakDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Update time stats every second when clocked in
  useEffect(() => {
    let intervalId: number;

    if (isClockedIn && sessionStartTime) {
      intervalId = window.setInterval(() => {
        const now = new Date();
        const sessionSeconds = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);

        setTimeStats(prev => {
          const newStats = { ...prev };
          
          // Update session duration
          newStats.sessionTime = sessionSeconds;

          // Calculate time based on current state and elapsed time
          switch (currentState) {
            case 'working':
              // Calculate work time as session time minus break and inactive time
              newStats.workTime = sessionSeconds - (prev.normalBreakTime + prev.officeBreakTime + prev.inactiveTime);
              newStats.payableTime = newStats.workTime + prev.officeBreakTime; // Work time plus office break time
              break;
            case 'normal_break':
              newStats.normalBreakTime = prev.normalBreakTime + 1;
              break;
            case 'office_break':
              newStats.officeBreakTime = prev.officeBreakTime + 1;
              newStats.payableTime = prev.workTime + prev.officeBreakTime + 1;
              break;
            case 'inactive':
              if (inactivityStartTime) {
                const inactiveSeconds = Math.floor((now.getTime() - inactivityStartTime) / 1000);
                newStats.inactiveTime = inactiveSeconds;
              }
              break;
          }

          return newStats;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isClockedIn, sessionStartTime, currentState, inactivityStartTime]);

  // Add break timer effect
  useEffect(() => {
    let breakTimerId: number;

    if (breakEndTime && (currentState === 'normal_break' || currentState === 'office_break')) {
      breakTimerId = window.setInterval(() => {
        const now = new Date();
        if (now >= breakEndTime) {
          // Break is over
          setCurrentState('working');
          setBreakEndTime(null);
          setTimeline(prev => [...prev, {
            type: 'break_end',
            timestamp: now,
            description: `Ended ${currentState === 'normal_break' ? 'Normal' : 'Office'} Break`
          }]);
        }
      }, 1000);
    }

    return () => {
      if (breakTimerId) {
        clearInterval(breakTimerId);
      }
    };
  }, [breakEndTime, currentState]);

  const handleResumeSession = useCallback(() => {
    const inactivityStart = new Date(inactivityStartTime || Date.now());
    const inactivityEnd = new Date();
    const inactiveDuration = inactivityStartTime ? Math.floor((inactivityEnd.getTime() - inactivityStartTime) / 1000) : 0;
    
    setTimeline(prev => [...prev, {
      type: 'inactivity_end',
      timestamp: inactivityEnd,
      description: `Inactivity Ended (${formatTimeWithSeconds(inactivityStart)} - ${formatTimeWithSeconds(inactivityEnd)}, duration: ${formatBreakDuration(inactiveDuration)})`
    }]);

    setShowInactivityDialog(false);
    setInactiveTime(0);
    setInactivityStartTime(null);
    setCurrentState('working');
    
    ipcRenderer.send('activity-status-changed', true);
    ipcRenderer.send('start-monitoring');
  }, [inactivityStartTime]);

  useEffect(() => {
    const handleActivityChange = (_: any, active: boolean) => {
      if (isClockedIn && !currentState.includes('break')) {
        setIsActive(active);
        if (!active) {
          const inactivityStartTimeWithOffset = Date.now() - 5000;
          setInactivityStartTime(inactivityStartTimeWithOffset);
          setCurrentState('inactive');
          
          // More detailed inactivity start entry
          setTimeline(prev => [...prev, {
            type: 'inactivity_start',
            timestamp: new Date(inactivityStartTimeWithOffset),
            description: `Inactivity Detected (started at ${formatTimeWithSeconds(new Date(inactivityStartTimeWithOffset))})`
          }]);
        }
        setShowInactivityDialog(!active);
      }
    };

    const handleResumeFromMain = () => {
      // Call handleResumeSession when spacebar is pressed
      handleResumeSession();
    };

    ipcRenderer.on('activity-status-changed', handleActivityChange);
    ipcRenderer.on('resume-activity', handleResumeFromMain);

    return () => {
      ipcRenderer.removeListener('activity-status-changed', handleActivityChange);
      ipcRenderer.removeListener('resume-activity', handleResumeFromMain);
    };
  }, [isClockedIn, inactivityStartTime, formatTime, currentState, handleResumeSession, formatTimeWithSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (inactivityStartTime && !isActive) {
      interval = setInterval(() => {
        // Calculate total inactivity time from the adjusted start time
        setInactiveTime(Date.now() - inactivityStartTime);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [inactivityStartTime, isActive]);

  const handleClockInOut = useCallback(() => {
    const now = new Date();
    if (!isClockedIn) {
      setIsClockedIn(true);
      setSessionStartTime(now);
      setCurrentState('working');
      setIsActive(true);
      ipcRenderer.send('clock-status-changed', true);  // Notify main process of clock in
      setTimeStats({
        workTime: 0,
        normalBreakTime: 0,
        officeBreakTime: 0,
        inactiveTime: 0,
        sessionTime: 0,
        payableTime: 0,
      });
      setTimeline(prev => [...prev, {
        type: 'clock_in',
        timestamp: now,
        description: 'Clocked In'
      }]);
    } else {
      // If on break, end it first
      if (currentState.includes('break') && breakEndTime) {
        const breakDuration = Math.floor((now.getTime() - (breakEndTime.getTime() - duration * 1000)) / 1000);
        setTimeline(prev => [...prev, {
          type: 'break_end',
          timestamp: now,
          description: `Ended ${currentState === 'normal_break' ? 'Normal' : 'Office'} Break (${formatTime(breakDuration)}) due to clock-out`
        }]);
      }
      
      setIsClockedIn(false);
      setSessionStartTime(null);
      setCurrentState('not_working');
      setBreakEndTime(null);
      setShowBreakDialog(false);
      setIsActive(true);
      ipcRenderer.send('clock-status-changed', false);  // Notify main process of clock out
      setShowInactivityDialog(false);
      setInactivityStartTime(null);
      setTimeline(prev => [...prev, {
        type: 'clock_out',
        timestamp: now,
        description: 'Clocked Out'
      }]);
    }
  }, [isClockedIn, currentState, breakEndTime, duration, formatTime]);

  const handleBreakStart = useCallback((type: 'normal' | 'office', duration: number) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 1000);
    setCurrentState(type === 'normal' ? 'normal_break' : 'office_break');
    setBreakEndTime(endTime);
    setDuration(duration);
    setShowBreakDialog(false);
    setTimeline(prev => [...prev, {
      type: 'break_start',
      timestamp: now,
      description: `Started ${type === 'normal' ? 'Normal' : 'Office'} Break for ${formatBreakDuration(duration)}`
    }]);
  }, []);

  const handleBreakEnd = useCallback(() => {
    const now = new Date();
    if (breakEndTime) {
      const actualDuration = Math.floor((now.getTime() - breakEndTime.getTime() + duration * 1000) / 1000);
      setCurrentState('working');
      setBreakEndTime(null);
      setDuration(0);
      setTimeline(prev => [...prev, {
        type: 'break_end',
        timestamp: now,
        description: `Ended ${currentState === 'normal_break' ? 'Normal' : 'Office'} Break (${formatTime(actualDuration)})`
      }]);
    }
  }, [breakEndTime, currentState, duration, formatTime]);

  const handleEndSession = () => {
    const inactivityStart = new Date(inactivityStartTime || Date.now());
    const inactivityEnd = new Date();
    const inactiveDuration = inactivityStartTime ? Math.floor((inactivityEnd.getTime() - inactivityStartTime) / 1000) : 0;
    
    // Add the inactivity end entry to timeline before clock out
    setTimeline(prev => [...prev, {
      type: 'inactivity_end',
      timestamp: inactivityEnd,
      description: `Inactivity Ended (${formatTimeWithSeconds(inactivityStart)} - ${formatTimeWithSeconds(inactivityEnd)}, duration: ${formatBreakDuration(inactiveDuration)})`
    }]);

    setShowInactivityDialog(false);
    setInactiveTime(0);
    setInactivityStartTime(null);
    if (isClockedIn) {
      handleClockInOut();
    }
  };

  return (
    <div className="time-tracker">
      <div className="tracker-card">
        <header className="tracker-header">
          <div className="header-buttons">
            <div className="controls">
              <button 
                onClick={handleClockInOut}
                // Remove focus after click
                onMouseUp={(e) => e.currentTarget.blur()}
                // Prevent spacebar from triggering when focused
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.preventDefault();
                  }
                }}
              >
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
            {isClockedIn && !currentState.includes('break') && (
              <button
                onClick={() => setShowBreakDialog(true)}
                className="break-button"
              >
                Take Break
              </button>
            )}
            {currentState.includes('break') && (
              <button
                onClick={handleBreakEnd}
                className="break-button end-break"
              >
                End Break Early
              </button>
            )}
          </div>
        </header>

        <div className="time-stats">
          <div className="stat-item">
            <label>Work Time:</label>
            <span>{formatTime(timeStats.workTime)}</span>
          </div>
          <div className="stat-item">
            <label>Normal Break:</label>
            <span>{formatTime(timeStats.normalBreakTime)}</span>
          </div>
          <div className="stat-item">
            <label>Office Break:</label>
            <span>{formatTime(timeStats.officeBreakTime)}</span>
          </div>
          <div className="stat-item">
            <label>Inactive Time:</label>
            <span>{formatTime(timeStats.inactiveTime)}</span>
          </div>
          <div className="stat-item">
            <label>Session Time:</label>
            <span>{formatTime(timeStats.sessionTime)}</span>
          </div>
          <div className="stat-item payable">
            <label>Payable Hours:</label>
            <span>{formatTime(timeStats.payableTime)}</span>
          </div>
        </div>

        <ActivityDashboard />

        <div className="timeline">
          <h3>Timeline</h3>
          <div className="timeline-entries">
            {timeline.map((entry, index) => (
              <div 
                key={index} 
                className="timeline-entry"
                data-type={entry.type}
              >
                <div className="timeline-content">
                  <time>{formatTimeWithSeconds(entry.timestamp)}</time>
                  <span className="timeline-event">{entry.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showBreakDialog && (
          <BreakDialog
            onStartBreak={handleBreakStart}
            onCancel={() => setShowBreakDialog(false)}
          />
        )}

        {showInactivityDialog && (
          <InactivityDialog
            inactiveTime={inactiveTime}
            onResume={handleResumeSession}
            onEndSession={handleEndSession}
            formatTime={formatTime}
          />
        )}
      </div>
    </div>
  );
};

export default TimeTracker; 