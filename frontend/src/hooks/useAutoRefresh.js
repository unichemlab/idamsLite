import { useEffect } from 'react';
import { useAutoRefreshContext } from '../components/RouteWrapper';

/**
 * Simple auto refresh hook
 * @param {Function} refreshCallback
 */
export default function useAutoRefresh(refreshCallback) {
  const { refreshTrigger } = useAutoRefreshContext();

  // Initial load
  useEffect(() => {
    if (typeof refreshCallback === 'function') {
      refreshCallback();
    }
  }, []);

  // Auto refresh
  useEffect(() => {
    if (refreshTrigger > 0 && typeof refreshCallback === 'function') {
      console.log(`[useAutoRefresh] 🔄 Refresh trigger: ${refreshTrigger}`);
      refreshCallback();
    }
  }, [refreshTrigger, refreshCallback]);
}