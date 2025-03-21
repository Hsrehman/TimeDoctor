import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface InactivityDialogProps {
  open: boolean;
  onResume: () => void;
  onEndSession: () => void;
  inactiveTime: number;
}

const InactivityDialog: React.FC<InactivityDialogProps> = ({
  open,
  onResume,
  onEndSession,
  inactiveTime,
}) => {
  const formatInactiveTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
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

  return (
    <Dialog open={open} onClose={onResume}>
      <DialogTitle>Inactivity Detected</DialogTitle>
      <DialogContent>
        <Typography>
          You have been inactive for {formatInactiveTime(inactiveTime)}. Would you like to resume your session or end it?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onEndSession} color="error">
          End Session
        </Button>
        <Button onClick={onResume} color="primary" variant="contained" autoFocus>
          Resume Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InactivityDialog; 