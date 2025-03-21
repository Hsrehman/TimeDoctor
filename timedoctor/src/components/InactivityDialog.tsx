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
  inactiveTime: number;
  onResume: () => void;
  onEndSession: () => void;
  formatTime: (seconds: number) => string;
}

const InactivityDialog: React.FC<InactivityDialogProps> = ({
  inactiveTime,
  onResume,
  onEndSession,
  formatTime
}) => {
  return (
    <Dialog 
      open={true} 
      onClose={onResume}
    >
      <DialogTitle>Inactivity Detected</DialogTitle>
      <DialogContent>
        <Typography>
          You have been inactive for {formatTime(Math.floor(inactiveTime / 1000))}. Would you like to resume your session or end it?
        </Typography>
        <Typography 
          variant="body2" 
          color="textSecondary" 
          style={{ marginTop: '1rem', fontStyle: 'italic' }}
        >
          Press spacebar to resume working
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onEndSession} 
          color="error"
          onMouseUp={(e) => e.currentTarget.blur()}
        >
          End Session
        </Button>
        <Button 
          onClick={onResume} 
          color="primary" 
          variant="contained" 
          autoFocus
          onMouseUp={(e) => e.currentTarget.blur()}
        >
          Resume Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InactivityDialog; 