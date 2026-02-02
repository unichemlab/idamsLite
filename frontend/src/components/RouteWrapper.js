import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Context for auto-refresh functionality
 */
const AutoRefreshContext = createContext({
  refreshTrigger: 0,
  forceRefresh: () => {},
});

/**
 * Hook to access auto-refresh context
 */
export const useAutoRefreshContext = () => {
  return useContext(AutoRefreshContext);
};

/**
 * Auto-Refresh Configuration
 */
const AUTO_REFRESH_CONFIG = {
  enabled: true,
  defaultInterval: 30000, // 30 seconds
  
  // Listing page paths
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
  
  // Patterns to exclude
  excludePatterns: ['/add', '/edit/', '/import', '/detail'],
  
  // Custom intervals for specific pages
  customIntervals: {
    '/dashboard': 60000,
    '/access-logs': 20000,
    '/activity-log': 20000,
    '/approver/pending': 15000,
  },
  
  debug: true,
};

/**
 * Get refresh interval for a specific path
 */
const getRefreshInterval = (pathname) => {
  for (const [path, interval] of Object.entries(AUTO_REFRESH_CONFIG.customIntervals)) {
    if (pathname.startsWith(path)) {
      return interval;
    }
  }
  return AUTO_REFRESH_CONFIG.defaultInterval;
};

/**
 * Check if a path should have auto-refresh enabled
 */
const shouldAutoRefresh = (pathname) => {
  if (!AUTO_REFRESH_CONFIG.enabled) {
    return false;
  }
  
  const endsWithId = /\/\d+$/.test(pathname);
  if (endsWithId) return false;
  
  const hasExcludedPattern = AUTO_REFRESH_CONFIG.excludePatterns.some(
    pattern => pathname.includes(pattern)
  );
  if (hasExcludedPattern) return false;
  
  return AUTO_REFRESH_CONFIG.listingPages.some(
    basePath => pathname === basePath || pathname.startsWith(basePath)
  );
};

/**
 * RouteWrapper component with Context Provider
 */
const RouteWrapper = ({ children }) => {
  const location = useLocation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const intervalRef = useRef(null);

  const forceRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    
    if (AUTO_REFRESH_CONFIG.debug) {
      console.log(`[Auto-Refresh] 🔄 Triggered refresh #${refreshTrigger + 1} for: ${location.pathname} at ${new Date().toLocaleTimeString()}`);
    }
  };

  useEffect(() => {
    const pathname = location.pathname;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const isListingPage = shouldAutoRefresh(pathname);
    
    if (isListingPage) {
      const refreshInterval = getRefreshInterval(pathname);
      
      if (AUTO_REFRESH_CONFIG.debug) {
        console.log(`[Auto-Refresh] ✅ Enabled for: ${pathname} (interval: ${refreshInterval}ms)`);
      }

      intervalRef.current = setInterval(() => {
        forceRefresh();
      }, refreshInterval);
    } else {
      if (AUTO_REFRESH_CONFIG.debug) {
        console.log(`[Auto-Refresh] ❌ Disabled for: ${pathname}`);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [location.pathname]);

  return (
    <AutoRefreshContext.Provider value={{ refreshTrigger, forceRefresh }}>
      {children}
    </AutoRefreshContext.Provider>
  );
};

export default RouteWrapper;