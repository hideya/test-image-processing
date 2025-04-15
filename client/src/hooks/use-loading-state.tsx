import { useState, useEffect } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

interface UseLoadingStateOptions {
  /**
   * Delay in milliseconds before showing the loading screen
   * This prevents flickering for very fast loads
   */
  delay?: number;
  
  /**
   * Additional time in milliseconds to keep showing the loading screen
   * after data has loaded. This helps prevent jarring transitions.
   */
  minimumLoadingTime?: number;
  
  /**
   * Optional query keys to specifically track
   * If provided, will only track loading states for these specific queries
   */
  queryKeys?: string[];

  /**
   * Force the loading state to be shown on initial page load
   * This is useful for showing a splash screen
   */
  forceInitialLoading?: boolean;
}

/**
 * Hook that provides a unified loading state for the application
 * Tracks React Query fetching and mutation states
 */
export function useLoadingState({
  delay = 0,
  minimumLoadingTime = 500,
  queryKeys,
  forceInitialLoading = true,
}: UseLoadingStateOptions = {}) {
  // Track if the app is in the initial loading phase
  const [initialLoading, setInitialLoading] = useState(forceInitialLoading);
  
  // Track if we should show the loading indicator
  const [showLoading, setShowLoading] = useState(forceInitialLoading);
  
  // Track the start time of loading to enforce minimum loading time
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(forceInitialLoading ? Date.now() : null);
  
  // Get the number of fetching queries from React Query
  const isFetching = useIsFetching(
    queryKeys ? { queryKey: queryKeys } : undefined
  );
  
  // Get the number of active mutations from React Query
  const isMutating = useIsMutating();
  
  // Combine all loading states
  const isLoading = isFetching > 0 || isMutating > 0 || initialLoading;
  
  // Handle initial loading and minimum loading time
  useEffect(() => {
    let initialLoadingTimer: NodeJS.Timeout;
    let minimumLoadingTimer: NodeJS.Timeout;
    
    // Set initial loading state with optional delay
    if (delay > 0) {
      initialLoadingTimer = setTimeout(() => {
        setInitialLoading(false);
      }, delay);
    } else {
      setInitialLoading(false);
    }
    
    return () => {
      if (initialLoadingTimer) clearTimeout(initialLoadingTimer);
      if (minimumLoadingTimer) clearTimeout(minimumLoadingTimer);
    };
  }, [delay]);
  
  // Track loading state changes
  useEffect(() => {
    let minimumLoadingTimer: NodeJS.Timeout;
    
    if (isLoading) {
      // If we start loading, record the start time
      if (loadingStartTime === null) {
        setLoadingStartTime(Date.now());
      }
      setShowLoading(true);
    } else if (loadingStartTime !== null) {
      // If loading completes, enforce minimum loading time
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minimumLoadingTime - elapsedTime);
      
      if (remainingTime > 0) {
        minimumLoadingTimer = setTimeout(() => {
          setShowLoading(false);
          setLoadingStartTime(null);
        }, remainingTime);
      } else {
        setShowLoading(false);
        setLoadingStartTime(null);
      }
    } else {
      setShowLoading(false);
    }
    
    return () => {
      if (minimumLoadingTimer) clearTimeout(minimumLoadingTimer);
    };
  }, [isLoading, loadingStartTime, minimumLoadingTime]);
  
  return {
    isLoading,
    showLoading,
  };
}
