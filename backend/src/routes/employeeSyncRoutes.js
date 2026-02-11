// const express = require("express");
// const router = express.Router();

// // Import controller
// const { syncADUsers } = require("../controllers/employeeSync");

// // Route for syncing AD users
// router.get("/api/ad-users-sync", syncADUsers);

// module.exports = router;


// routes/adSync.routes.js

// ============================================================
// FILE: backend/routes/sync.js (or adSync.js)
// PURPOSE: Routes for AD synchronization endpoints
// ============================================================

const express = require('express');
const router = express.Router();

// Import sync functions
const { 
  syncAllOUs, 
  getOUsWithEmployees, 
  getSyncHistory, 
  getRunDetails,
  autoSyncChanges,
  getStaleUsersReport,
  deactivateStaleUsers
} = require('../controllers/employeeSync');
const { 
  startCronJob, 
  stopCronJob, 
  getCronStatus,
  updateCronSchedule 
} = require('../controllers/cronScheduler');


// Optional: Import authentication middleware
// const { authenticate, authorize } = require('../middleware/auth');

/* ================= SYNC OPERATIONS ================= */

/**
 * POST /api/sync/all
 * Trigger full AD sync across all OUs
 * 
 * Response:
 * {
 *   "status": true,
 *   "run_id": "uuid",
 *   "summary": {
 *     "status": "SUCCESS",
 *     "total_ous": 143,
 *     "total_users": 5810,
 *     "inserted": 1388,
 *     "updated": 4422,
 *     "failed": 0,
 *     "skipped": 0,
 *     "deactivated": 5,
 *     "duration_seconds": 338
 *   }
 * }
 */
router.post('/sync/all', syncAllOUs);

// With authentication (uncomment if needed):
// router.post('/sync/all', authenticate, authorize(['admin', 'sync_manager']), syncAllOUs);

/**
 * POST /api/sync/auto
 * Trigger auto-sync (only changed users since last sync)
 * 
 * Response:
 * {
 *   "status": true,
 *   "run_id": "uuid",
 *   "summary": {
 *     "changed_users": 15,
 *     "inserted": 2,
 *     "updated": 13,
 *     "failed": 0,
 *     "skipped": 0,
 *     "deactivated": 1,
 *     "duration_seconds": 8
 *   }
 * }
 */
router.post('/sync/auto', autoSyncChanges);

/* ================= ORGANIZATIONAL UNITS ================= */

/**
 * GET /api/sync/ous
 * Get list of all OUs with employee counts
 * 
 * Response:
 * {
 *   "status": true,
 *   "summary": {
 *     "total_ous": 143,
 *     "total_users": 5810
 *   },
 *   "ous": [
 *     {
 *       "name": "USERS",
 *       "full_path": "OU=USERS,OU=PRODUCTION,OU=TERMINAL SERVER,OU=GOA I",
 *       "employee_count": 308
 *     }
 *   ]
 * }
 */
router.get('/sync/ous', getOUsWithEmployees);

/* ================= SYNC HISTORY & REPORTS ================= */

/**
 * GET /api/sync/history?limit=20
 * Get sync run history
 * 
 * Query Parameters:
 * - limit: Number of runs to return (default: 20)
 * 
 * Response:
 * {
 *   "status": true,
 *   "runs": [
 *     {
 *       "run_id": "uuid",
 *       "start_time": "2026-02-09T11:52:29Z",
 *       "end_time": "2026-02-09T11:58:07Z",
 *       "duration_seconds": 338,
 *       "total_ous": 143,
 *       "total_users": 5810,
 *       "inserted": 1388,
 *       "updated": 4422,
 *       "failed": 0,
 *       "skipped": 0,
 *       "status": "SUCCESS",
 *       "triggered_by": "MANUAL"
 *     }
 *   ]
 * }
 */
router.get('/sync/history', getSyncHistory);

/**
 * GET /api/sync/run/:runId
 * Get detailed information about a specific sync run
 * 
 * Response:
 * {
 *   "status": true,
 *   "run": {
 *     "run_id": "uuid",
 *     "start_time": "2026-02-09T11:52:29Z",
 *     "duration_seconds": 338,
 *     ...
 *   },
 *   "ous": [
 *     {
 *       "ou_path": "OU=USERS,OU=PRODUCTION,...",
 *       "total_users": 308,
 *       "inserted": 3,
 *       "updated": 305,
 *       "status": "SUCCESS"
 *     }
 *   ]
 * }
 */
router.get('/sync/run/:runId', getRunDetails);

/**
 * GET /api/sync/stale-users?days=7
 * Get report of users not seen in AD for X days
 * 
 * Query Parameters:
 * - days: Number of days threshold (default: 7)
 * 
 * Response:
 * {
 *   "status": true,
 *   "threshold_days": 7,
 *   "message": "Found 5 users not seen in 7+ days",
 *   "users": [
 *     {
 *       "employee_id": "chetan.borawake",
 *       "employee_name": "Chetan Borawake",
 *       "employee_code": "904768",
 *       "department": "International Business",
 *       "status": "Inactive",
 *       "last_seen_in_ad": "2026-02-03T10:00:00Z",
 *       "days_since_seen": 7
 *     }
 *   ]
 * }
 */
router.get('/sync/stale-users', getStaleUsersReport);

/* ================= MANUAL CLEANUP (ADMIN ONLY) ================= */

/**
 * POST /api/sync/cleanup-stale
 * Manually trigger cleanup of stale users
 * (Usually runs automatically after each sync)
 * 
 * Request Body (optional):
 * {
 *   "days": 7  // Custom threshold
 * }
 * 
 * Response:
 * {
 *   "status": true,
 *   "message": "Deactivated 5 users not seen in 7+ days",
 *   "deactivated_count": 5
 * }
 */
router.post('/sync/cleanup-stale', async (req, res) => {
  try {
    const days = parseInt(req.body.days) || parseInt(process.env.STALE_USER_DAYS || '7', 10);
    const deactivatedCount = await deactivateStaleUsers(days);
    
    return res.json({
      status: true,
      message: `Deactivated ${deactivatedCount} users not seen in ${days}+ days`,
      deactivated_count: deactivatedCount,
      threshold_days: days
    });
  } catch (err) {
    console.error('[Manual Cleanup Error]', err);
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

// With authentication (uncomment if needed):
// router.post('/sync/cleanup-stale', authenticate, authorize(['admin']), async (req, res) => { ... });

/* ================= HEALTH CHECK ================= */

/**
 * GET /api/sync/health
 * Check sync service health and configuration
 * 
 * Response:
 * {
 *   "status": true,
 *   "service": "AD Sync Service",
 *   "version": "2.0.0",
 *   "config": {
 *     "stale_user_threshold_days": 7,
 *     "ad_server_configured": true,
 *     "email_configured": true
 *   }
 * }
 */
router.get('/sync/health', async (req, res) => {
  try {
    return res.json({
      status: true,
      service: 'AD Sync Service',
      version: '2.0.0',
      config: {
        stale_user_threshold_days: parseInt(process.env.STALE_USER_DAYS || '7', 10),
        ad_server_configured: !!process.env.AD_SERVER,
        email_configured: !!process.env.SMTP_HOST && !!process.env.ALERT_EMAIL,
        last_sync_tracking: true,
        auto_cleanup_enabled: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

/* ================= CRON ENDPOINTS ================= */

/**
 * POST /api/ad-sync/cron/start
 * Start cron job with optional custom schedule
 * Body: { schedule: "0 2 * * *" } (optional)
 */
router.post('/cron/start', (req, res) => {
  try {
    const schedule = req.body.schedule || '0 2 * * *'; // Default: 2 AM daily
    const result = startCronJob(schedule);
    
    res.json({
      status: result.success,
      message: result.success ? 'Cron job started' : 'Failed to start cron job',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

/**
 * POST /api/ad-sync/cron/stop
 * Stop the cron job
 */
router.post('/cron/stop', (req, res) => {
  try {
    const result = stopCronJob();
    
    res.json({
      status: result.success,
      message: result.success ? 'Cron job stopped' : result.error
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

/**
 * GET /api/ad-sync/cron/status
 * Get current cron job status
 */
router.get('/cron/status', (req, res) => {
  try {
    const status = getCronStatus();
    
    res.json({
      status: true,
      data: status
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

/**
 * PUT /api/ad-sync/cron/schedule
 * Update cron schedule
 * Body: { schedule: "0 3 * * *" }
 */
router.put('/cron/schedule', (req, res) => {
  try {
    const { schedule } = req.body;
    
    if (!schedule) {
      return res.status(400).json({
        status: false,
        error: 'Schedule is required'
      });
    }

    const result = updateCronSchedule(schedule);
    
    res.json({
      status: result.success,
      message: result.success ? 'Cron schedule updated' : 'Failed to update schedule',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

module.exports = router;
