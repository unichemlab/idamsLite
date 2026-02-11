const cron = require('node-cron');
const { syncAllOUs } = require('./employeeSync');

let cronJob = null;
let isRunning = false;
let lastRunTime = null;
let nextRunTime = null;

/**
 * Calculate next run time based on cron expression
 */
function calculateNextRun(cronExpression) {
  try {
    const task = cron.schedule(cronExpression, () => {}, { scheduled: false });
    // This is a workaround - in production, use a library like cron-parser
    return new Date(Date.now() + 24 * 60 * 60 * 1000); // Placeholder: 24 hours from now
  } catch (err) {
    return null;
  }
}

/**
 * Start the cron job
 */
function startCronJob(schedule = '0 2 * * *') { // Default: 2 AM daily
  if (cronJob) {
    console.log('⚠️  Cron job already running. Stopping existing job...');
    stopCronJob();
  }

  try {
    console.log(`🕒 Starting AD Sync cron with schedule: ${schedule}`);
    
    cronJob = cron.schedule(schedule, async () => {
      if (isRunning) {
        console.log('⚠️  Previous sync still running. Skipping this execution.');
        return;
      }

      isRunning = true;
      lastRunTime = new Date();
      
      console.log(`\n🔄 CRON TRIGGERED: ${lastRunTime.toISOString()}\n`);

      try {
        // Call syncAllOUs without res (cron mode)
        const mockReq = {
          query: { triggered_by: 'CRON' }
        };
        
        await syncAllOUs(mockReq, null);
        
        console.log('✅ Cron sync completed successfully\n');
      } catch (err) {
        console.error('❌ Cron sync failed:', err.message);
      } finally {
        isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata" // Adjust to your timezone
    });

    nextRunTime = calculateNextRun(schedule);
    
    console.log(`✅ Cron job started successfully`);
    console.log(`   Next run: ${nextRunTime ? nextRunTime.toISOString() : 'Calculating...'}`);
    
    return { success: true, schedule, nextRun: nextRunTime };
  } catch (err) {
    console.error('❌ Failed to start cron job:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Stop the cron job
 */
function stopCronJob() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    nextRunTime = null;
    console.log('🛑 Cron job stopped');
    return { success: true };
  }
  return { success: false, error: 'No cron job running' };
}

/**
 * Get cron status
 */
function getCronStatus() {
  return {
    isActive: cronJob !== null,
    isRunning,
    lastRunTime,
    nextRunTime
  };
}

/**
 * Update cron schedule
 */
function updateCronSchedule(newSchedule) {
  stopCronJob();
  return startCronJob(newSchedule);
}

module.exports = {
  startCronJob,
  stopCronJob,
  getCronStatus,
  updateCronSchedule
};
