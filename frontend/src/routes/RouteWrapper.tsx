import React, { ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

interface RouteWrapperProps {
  children: ReactNode;
}

const LISTING_PATHS = [
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
  '/active-user-logs',
  '/activity-log',
  '/admin-approval',
  '/task',
  '/approver/pending',
  '/approver/history',
  '/dashboard'
];

const RouteWrapper: React.FC<RouteWrapperProps> = ({ children }) => {
  const location = useLocation();
  const previousPathRef = useRef<string>("");
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isListingPage = (path: string) => 
    LISTING_PATHS.some(listingPath => path.includes(listingPath));

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;

    // Update the previous path
    previousPathRef.current = currentPath;

    // Skip if this is the initial render (no previous path)
    if (!previousPath) return;

    // Skip if current page is not a listing page
    if (!isListingPage(currentPath)) return;

    // Skip if we're navigating FROM a listing page TO another listing page
    // This prevents refresh when navigating between tabs or similar actions
    const navigatingBetweenListings = isListingPage(previousPath) && isListingPage(currentPath);
    
    // Skip if coming from the same base path (e.g., /approver/pending to /approver/pending after modal close)
    const sameBasePath = currentPath.split('/')[1] === previousPath.split('/')[1];

    if (navigatingBetweenListings && sameBasePath) {
      console.log("🚫 Skipping refresh - same section navigation:", currentPath);
      return;
    }

    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Add a small delay to ensure database operations complete
    // This is especially important after approval/rejection actions
    refreshTimeoutRef.current = setTimeout(() => {
      console.log("🔄 RouteWrapper refresh triggered:", currentPath);
      
      window.dispatchEvent(
        new CustomEvent("GLOBAL_REFRESH", {
          detail: {
            path: currentPath,
            previousPath: previousPath,
            time: Date.now()
          }
        })
      );
    }, 300); // 300ms delay to allow database commits

    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [location.pathname]);

  return <>{children}</>;
};

export default RouteWrapper;