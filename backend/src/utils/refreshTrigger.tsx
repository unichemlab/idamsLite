// refreshTrigger.ts - Utility for manual refresh control

/**
 * Manually trigger a refresh for listing pages
 * Call this after approval/rejection actions complete
 */
export const triggerListingRefresh = (pagePath?: string) => {
  console.log("🔄 Manual refresh triggered for:", pagePath || "current page");
  
  window.dispatchEvent(
    new CustomEvent("GLOBAL_REFRESH", {
      detail: {
        path: pagePath || window.location.pathname,
        time: Date.now(),
        manual: true
      }
    })
  );
};

/**
 * Trigger refresh after a delay (useful after async operations)
 */
export const triggerListingRefreshDelayed = (delay: number = 500, pagePath?: string) => {
  setTimeout(() => {
    triggerListingRefresh(pagePath);
  }, delay);
};