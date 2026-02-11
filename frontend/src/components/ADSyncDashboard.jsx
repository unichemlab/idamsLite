import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Schedule,
  CheckCircle,
  Error,
  Warning,
  Info,
  Visibility
} from '@mui/icons-material';
import { API_BASE } from '../utils/api';


function ADSyncDashboard() {
  const [syncHistory, setSyncHistory] = useState([]);
  const [cronStatus, setCronStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [cronSchedule, setCronSchedule] = useState('0 2 * * *');
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchSyncHistory();
    fetchCronStatus();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchCronStatus();
      if (cronStatus?.isRunning) {
        fetchSyncHistory();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSyncHistory = async () => {
  try {
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/sync/history`);
    const data = await res.json();
    if (data.status) {
      setSyncHistory(data.runs);
    }
  } catch (err) {
    console.error('Failed to fetch sync history:', err);
  } finally {
    setLoading(false);
  }
};

 const fetchCronStatus = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/cron/status`);
    const data = await res.json();
    if (data.status) {
      setCronStatus(data.data);
    }
  } catch (err) {
    console.error('Failed to fetch cron status:', err);
  }
};


  const handleManualSync = async () => {
  if (!window.confirm('Are you sure you want to start a manual sync?')) return;

  try {
    setSyncing(true);
    setAlert({ type: 'info', message: 'Sync started. This may take several minutes...' });

    const res = await fetch(`${API_BASE}/api/sync/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggered_by: 'MANUAL' })
    });

    const data = await res.json();

    if (data.status) {
      setAlert({ type: 'success', message: `Sync completed: ${data.summary.status}` });
      fetchSyncHistory();
    }
  } catch (err) {
    setAlert({ type: 'error', message: `Sync failed: ${err}` });
  } finally {
    setSyncing(false);
  }
};


  const handleStartCron = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/cron/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: cronSchedule })
    });

    const data = await res.json();
    if (data.status) {
      setAlert({ type: 'success', message: 'Cron job started successfully' });
      fetchCronStatus();
    }
  } catch (err) {
    setAlert({ type: 'error', message: `Failed to start cron: ${err.message}` });
  }
};


  const handleStopCron = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/cron/stop`, { method: 'POST' });
    const data = await res.json();

    if (data.status) {
      setAlert({ type: 'success', message: 'Cron job stopped successfully' });
      fetchCronStatus();
    }
  } catch (err) {
    setAlert({ type: 'error', message: `Failed to stop cron: ${err.message}` });
  }
};


  const handleUpdateSchedule = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/cron/schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: cronSchedule })
    });

    const data = await res.json();
    if (data.status) {
      setAlert({ type: 'success', message: 'Cron schedule updated successfully' });
      setScheduleDialog(false);
      fetchCronStatus();
    }
  } catch (err) {
    setAlert({ type: 'error', message: `Failed to update schedule: ${err.message}` });
  }
};


 const handleViewDetails = async (runId) => {
  try {
    const res = await fetch(`${API_BASE}/api/sync/run/${runId}`);
    const data = await res.json();

    if (data.status) {
      setSelectedRun(data);
      setDetailsDialog(true);
    }
  } catch (err) {
    setAlert({ type: 'error', message: `Failed to load details: ${err.message}` });
  }
};


  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'success';
      case 'PARTIAL': return 'warning';
      case 'FAILURE': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle />;
      case 'PARTIAL': return <Warning />;
      case 'FAILURE': return <Error />;
      default: return <Info />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Alert */}
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Active Directory Sync Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and control AD user synchronization
        </Typography>
      </Box>

      {/* Control Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Manual Sync Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Manual Sync
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Trigger an immediate sync of all OUs
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={syncing ? <CircularProgress size={20} /> : <PlayArrow />}
                  onClick={handleManualSync}
                  disabled={syncing || cronStatus?.isRunning}
                >
                  {syncing ? 'Syncing...' : 'Start Sync'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cron Status Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box flex={1}>
                  <Typography variant="h6" gutterBottom>
                    Automated Sync (Cron)
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={cronStatus?.isActive ? 'Active' : 'Inactive'}
                      color={cronStatus?.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    {cronStatus?.isRunning && (
                      <Chip
                        label="Running Now"
                        color="info"
                        size="small"
                        icon={<CircularProgress size={12} />}
                      />
                    )}
                  </Box>
                  {cronStatus?.nextRunTime && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Next run: {formatDate(cronStatus.nextRunTime)}
                    </Typography>
                  )}
                </Box>
                <Box display="flex" gap={1}>
                  <Tooltip title="Update Schedule">
                    <IconButton onClick={() => setScheduleDialog(true)}>
                      <Schedule />
                    </IconButton>
                  </Tooltip>
                  {cronStatus?.isActive ? (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Stop />}
                      onClick={handleStopCron}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<PlayArrow />}
                      onClick={handleStartCron}
                    >
                      Start
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sync History Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Sync History
            </Typography>
            <IconButton onClick={fetchSyncHistory} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Run ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>OUs</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Inserted</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell>Failed</TableCell>
                    <TableCell>Triggered By</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {syncHistory.map((run) => (
                    <TableRow key={run.run_id}>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {run.run_id.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(run.status)}
                          label={run.status}
                          color={getStatusColor(run.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(run.start_time)}</TableCell>
                      <TableCell>{run.duration_seconds}s</TableCell>
                      <TableCell>{run.total_ous}</TableCell>
                      <TableCell>{run.total_users}</TableCell>
                      <TableCell>
                        <Chip label={run.inserted} color="success" size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={run.updated} color="info" size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={run.failed} color="error" size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={run.triggered_by} size="small" />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(run.run_id)}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialog} onClose={() => setScheduleDialog(false)}>
        <DialogTitle>Update Cron Schedule</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Cron Expression"
            value={cronSchedule}
            onChange={(e) => setCronSchedule(e.target.value)}
            helperText="Format: minute hour day month weekday (e.g., '0 2 * * *' for 2 AM daily)"
            sx={{ mt: 2 }}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Common examples:
            </Typography>
            <Box component="ul" sx={{ mt: 1 }}>
              <Typography component="li" variant="caption">0 2 * * * - Every day at 2 AM</Typography>
              <Typography component="li" variant="caption">0 */6 * * * - Every 6 hours</Typography>
              <Typography component="li" variant="caption">0 0 * * 0 - Every Sunday at midnight</Typography>
              <Typography component="li" variant="caption">*/30 * * * * - Every 30 minutes</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateSchedule} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Run Details Dialog */}
      <Dialog 
        open={detailsDialog} 
        onClose={() => setDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Run Details</DialogTitle>
        <DialogContent>
          {selectedRun && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">Run ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedRun.run.run_id}
                </Typography>
              </Box>

              <Typography variant="h6" gutterBottom>OU Breakdown</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>OU Path</TableCell>
                      <TableCell>Users</TableCell>
                      <TableCell>Inserted</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell>Failed</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRun.ous.map((ou, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{ou.ou_path}</TableCell>
                        <TableCell>{ou.total_users}</TableCell>
                        <TableCell>{ou.inserted}</TableCell>
                        <TableCell>{ou.updated}</TableCell>
                        <TableCell>{ou.failed}</TableCell>
                        <TableCell>
                          <Chip
                            label={ou.status}
                            color={getStatusColor(ou.status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ADSyncDashboard;
