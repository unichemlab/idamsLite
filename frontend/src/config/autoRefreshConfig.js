/**
 * Auto-Refresh Configuration
 * Centralized configuration for auto-refresh functionality across all listing pages
 */

export const AUTO_REFRESH_CONFIG = {
  // Enable/disable auto-refresh globally
  enabled: true,
  
  // Default refresh interval in milliseconds (30 seconds)
  defaultInterval: 30000,
  
  // Listing page paths that should have auto-refresh
  listingPages: [
    '/user-requests',
    '/plant-itsupport',
    '/plant-master',
    '/application-masters',
    '/task-closure-bin',
    '/department-master',
    '/user-master',
    '/role-master',
    '/server-master',
    '/network-master',
    '/system-master',
    '/vendor-information',
    '/access-logs',
    '/activity-log',
    '/admin-approval',
    '/task',
    '/approver/pending',
    '/approver/history',
    '/dashboard',
  ],
  
  // Patterns to exclude from auto-refresh
  excludePatterns: [
    '/add',
    '/edit/',
    '/import',
    '/detail',
    '/:id',
  ],
  
  // Custom intervals for specific pages (in milliseconds)
  customIntervals: {
    '/dashboard': 60000,        // 1 minute
    '/access-logs': 20000,      // 20 seconds
    '/activity-log': 20000,     // 20 seconds
    '/approver/pending': 15000, // 15 seconds (more frequent for time-sensitive data)
  },
  
  // Show console logs for debugging
  debug: true,
};

/**
 * Get refresh interval for a specific path
 * @param {string} pathname - Current route pathname
 * @returns {number} Refresh interval in milliseconds
 */
export const getRefreshInterval = (pathname) => {
  // Check if there's a custom interval for this path
  for (const [path, interval] of Object.entries(AUTO_REFRESH_CONFIG.customIntervals)) {
    if (pathname.startsWith(path)) {
      return interval;
    }
  }
  
  // Return default interval
  return AUTO_REFRESH_CONFIG.defaultInterval;
};

/**
 * Check if a path should have auto-refresh enabled
 * @param {string} pathname - Current route pathname
 * @returns {boolean} Whether auto-refresh should be enabled
 */
export const shouldAutoRefresh = (pathname) => {
  if (!AUTO_REFRESH_CONFIG.enabled) {
    return false;
  }
  
  // Check if path ends with a number (detail page)
  const endsWithId = /\/\d+$/.test(pathname);
  if (endsWithId) {
    return false;
  }
  
  // Check if path contains excluded patterns
  const hasExcludedPattern = AUTO_REFRESH_CONFIG.excludePatterns.some(
    pattern => pathname.includes(pattern)
  );
  if (hasExcludedPattern) {
    return false;
  }
  
  // Check if path is in listing pages
  return AUTO_REFRESH_CONFIG.listingPages.some(
    basePath => pathname === basePath || pathname.startsWith(basePath)
  );
};

export default AUTO_REFRESH_CONFIG;