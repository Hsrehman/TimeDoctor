import React, { useState } from 'react';
import './BreakDialog.css';

interface BreakDialogProps {
  onStartBreak: (type: 'normal' | 'office', duration: number) => void;
  onCancel: () => void;
}

const BreakDialog: React.FC<BreakDialogProps> = ({ onStartBreak, onCancel }) => {
  const [breakType, setBreakType] = useState<'normal' | 'office'>('normal');
  const [minutes, setMinutes] = useState(15); // Default 15 minutes
  const [seconds, setSeconds] = useState(0);

  const minuteOptions = Array.from({ length: 60 }, (_, i) => i); // 0-59 minutes
  const secondOptions = Array.from({ length: 60 }, (_, i) => i); // 0-59 seconds

  const handleStartBreak = () => {
    const totalSeconds = (minutes * 60) + seconds;
    onStartBreak(breakType, totalSeconds);
  };

  return (
    <div className="break-dialog-overlay">
      <div className="break-dialog">
        <h2>Take a Break</h2>
        
        <div className="break-type-selector">
          <label className="break-type-option">
            <input
              type="radio"
              name="breakType"
              value="normal"
              checked={breakType === 'normal'}
              onChange={(e) => setBreakType(e.target.value as 'normal' | 'office')}
            />
            <span>Normal Break</span>
          </label>
          <label className="break-type-option">
            <input
              type="radio"
              name="breakType"
              value="office"
              checked={breakType === 'office'}
              onChange={(e) => setBreakType(e.target.value as 'normal' | 'office')}
            />
            <span>Office Work Break</span>
          </label>
        </div>

        <div className="duration-selector">
          <label>Duration:</label>
          <div className="time-picker">
            <div className="time-picker-column">
              <select 
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="time-picker-wheel"
              >
                {minuteOptions.map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}m</option>
                ))}
              </select>
            </div>
            <div className="time-picker-separator">:</div>
            <div className="time-picker-column">
              <select
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                className="time-picker-wheel"
              >
                {secondOptions.map(s => (
                  <option key={s} value={s}>{s.toString().padStart(2, '0')}s</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="break-dialog-actions">
          <button className="break-dialog-button primary" onClick={handleStartBreak}>
            Start Break
          </button>
          <button className="break-dialog-button secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreakDialog; 