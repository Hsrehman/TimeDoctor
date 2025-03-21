import React, { useState, useEffect, useCallback } from 'react';
import './TimeTracker.css';
import BreakDialog from './BreakDialog';

interface TimeStats {
  workTime: number;
  normalBreakTime: number;
  officeBreakTime: number;
  inactiveTime: number;
  sessionTime: number;
}

interface TimelineEntry {
  timestamp: Date;
  event: string;
  details?: string;
}

const TimeTracker: React.FC = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [timeStats, setTimeStats] = useState<TimeStats>({
    workTime: 0,
    normalBreakTime: 0,
    officeBreakTime: 0,
    inactiveTime: 0,
    sessionTime: 0,
  });
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [currentState, setCurrentState] = useState<'working' | 'normal_break' | 'office_break' | 'inactive'>('working');
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [breakEndTime, setBreakEndTime] = useState<Date | null>(null);

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

          // Update specific time based on current state
          switch (currentState) {
            case 'working':
              newStats.workTime = prev.workTime + 1;
              break;
            case 'normal_break':
              newStats.normalBreakTime = prev.normalBreakTime + 1;
              break;
            case 'office_break':
              newStats.officeBreakTime = prev.officeBreakTime + 1;
              break;
            case 'inactive':
              newStats.inactiveTime = prev.inactiveTime + 1;
              break;
          }

          return newStats;
        });
      }, 1000); // Update every second
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isClockedIn, sessionStartTime, currentState]);

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
            timestamp: now,
            event: `Ended ${currentState === 'normal_break' ? 'Normal' : 'Office'} Break`
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

  const handleClockInOut = useCallback(() => {
    const now = new Date();
    
    if (!isClockedIn) {
      // Clock In
      setIsClockedIn(true);
      setSessionStartTime(now);
      setCurrentState('working');
      setTimeline(prev => [...prev, {
        timestamp: now,
        event: 'Clocked In'
      }]);
    } else {
      // Clock Out
      const finalStats = {
        workTime: timeStats.workTime,
        normalBreakTime: timeStats.normalBreakTime,
        officeBreakTime: timeStats.officeBreakTime,
        inactiveTime: timeStats.inactiveTime,
        sessionTime: timeStats.sessionTime
      };

      // Reset all states
      setIsClockedIn(false);
      setSessionStartTime(null);
      setCurrentState('working');
      setBreakEndTime(null);
      setShowBreakDialog(false);
      
      // Add final timeline entry
      setTimeline(prev => [...prev, {
        timestamp: now,
        event: 'Clocked Out',
        details: `Total session time: ${formatTime(finalStats.sessionTime)}`
      }]);

      // Reset stats for next session
      setTimeStats({
        workTime: 0,
        normalBreakTime: 0,
        officeBreakTime: 0,
        inactiveTime: 0,
        sessionTime: 0,
      });
    }
  }, [timeStats]);

  const handleStartBreak = useCallback((type: 'normal' | 'office', duration: number) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 1000);
    
    setShowBreakDialog(false);
    setBreakEndTime(endTime);
    setCurrentState(type === 'normal' ? 'normal_break' : 'office_break');
    
    setTimeline(prev => [...prev, {
      timestamp: now,
      event: `Started ${type === 'normal' ? 'Normal' : 'Office'} Break`,
      details: `Duration: ${Math.floor(duration / 60)}h ${duration % 60}m`
    }]);
  }, []);

  const handleBreakButtonClick = useCallback(() => {
    if (isClockedIn) {
      setShowBreakDialog(true);
    }
  }, [isClockedIn]);

  // Format time in hours, minutes and seconds
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${remainingSeconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="time-tracker">
      <div className="tracker-card">
        <header className="tracker-header">
          <div className="header-buttons">
            <button 
              onClick={handleClockInOut}
              className={`clock-button ${isClockedIn ? 'clocked-in' : ''}`}
            >
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </button>
            {isClockedIn && (
              <button
                onClick={handleBreakButtonClick}
                className="break-button"
                disabled={currentState.includes('break')}
              >
                Take Break
              </button>
            )}
          </div>
          {breakEndTime && (
            <div className="break-timer">
              Break ends in: {formatTime(Math.ceil((breakEndTime.getTime() - Date.now()) / 1000))}
            </div>
          )}
        </header>

        <section className="statistics">
          <h2>Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Work Time</div>
              <div className="stat-value">{formatTime(timeStats.workTime)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Normal Break</div>
              <div className="stat-value">{formatTime(timeStats.normalBreakTime)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Office Break</div>
              <div className="stat-value">{formatTime(timeStats.officeBreakTime)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Inactive Time</div>
              <div className="stat-value">{formatTime(timeStats.inactiveTime)}</div>
            </div>
            <div className="stat-item session-duration">
              <div className="stat-label">Session Duration</div>
              <div className="stat-value">{formatTime(timeStats.sessionTime)}</div>
            </div>
          </div>
        </section>

        <section className="timeline">
          <h2>Timeline</h2>
          <div className="timeline-container">
            {timeline.length === 0 ? (
              <div className="timeline-empty">No events yet</div>
            ) : (
              <div className="timeline-entries">
                {timeline.map((entry, index) => (
                  <div key={index} className="timeline-entry">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <time>{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      <span className="timeline-event">{entry.event}</span>
                      {entry.details && <p className="timeline-details">{entry.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {showBreakDialog && (
          <BreakDialog
            onStartBreak={handleStartBreak}
            onCancel={() => setShowBreakDialog(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TimeTracker; 