import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import { ipcRenderer } from 'electron';

interface ActivityEntry {
  id: string;
  name: string;
  title: string;
  url?: string;
  category: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  type: 'application' | 'system' | 'browser';
  productivityScore: number;
}

interface ActivityStats {
  totalTime: number;
  productiveTime: number;
  unproductiveTime: number;
  neutralTime: number;
  averageProductivityScore: number;
  applicationBreakdown: { [key: string]: number };
  categoryBreakdown: { [key: string]: number };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};

const ActivityDashboard: React.FC = () => {
  const [currentActivity, setCurrentActivity] = useState<ActivityEntry | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  const fetchData = async () => {
    try {
      const history = await ipcRenderer.invoke('get-activity-history');
      const current = await ipcRenderer.invoke('get-current-activity');
      const statistics = await ipcRenderer.invoke('get-activity-stats');
      
      setActivityHistory(history);
      setCurrentActivity(current);
      setStats(statistics);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Activity Dashboard
        </Typography>

        {currentActivity ? (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Current Activity
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Application: {currentActivity.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Window: {currentActivity.title}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Category: {currentActivity.category}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Productivity Score: {currentActivity.productivityScore}%
                </Typography>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle1" align="center" color="textSecondary">
              Not currently tracking activity
            </Typography>
            <Typography variant="body2" align="center" color="textSecondary" sx={{ mt: 1 }}>
              Clock in to start tracking your activities
            </Typography>
          </Box>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Applications" />
            <Tab label="Categories" />
            <Tab label="Timeline" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {stats && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Time Distribution
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Productive Time: {formatDuration(stats.productiveTime)}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stats.productiveTime / stats.totalTime) * 100}
                      color="success"
                      sx={{ mt: 1, mb: 2 }}
                    />
                    <Typography variant="body2">
                      Neutral Time: {formatDuration(stats.neutralTime)}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stats.neutralTime / stats.totalTime) * 100}
                      color="primary"
                      sx={{ mt: 1, mb: 2 }}
                    />
                    <Typography variant="body2">
                      Unproductive Time: {formatDuration(stats.unproductiveTime)}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stats.unproductiveTime / stats.totalTime) * 100}
                      color="error"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Overall Statistics
                  </Typography>
                  <Typography variant="body2">
                    Total Time: {formatDuration(stats.totalTime)}
                  </Typography>
                  <Typography variant="body2">
                    Average Productivity Score: {Math.round(stats.averageProductivityScore)}%
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {stats && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Application</TableCell>
                    <TableCell align="right">Time Spent</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(stats.applicationBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([app, time]) => (
                      <TableRow key={app}>
                        <TableCell>{app}</TableCell>
                        <TableCell align="right">{formatDuration(time)}</TableCell>
                        <TableCell align="right">
                          {Math.round((time / stats.totalTime) * 100)}%
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {stats && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Time Spent</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(stats.categoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, time]) => (
                      <TableRow key={category}>
                        <TableCell>{category}</TableCell>
                        <TableCell align="right">{formatDuration(time)}</TableCell>
                        <TableCell align="right">
                          {Math.round((time / stats.totalTime) * 100)}%
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Application</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activityHistory.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>{formatTime(activity.startTime)}</TableCell>
                    <TableCell>{activity.name}</TableCell>
                    <TableCell>{activity.title}</TableCell>
                    <TableCell>{activity.category}</TableCell>
                    <TableCell align="right">
                      {activity.duration ? formatDuration(activity.duration) : 'Active'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ActivityDashboard; 