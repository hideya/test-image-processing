import React, { useEffect } from 'react';
import { useLocation } from 'wouter';

export function RouterDebugger() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    console.log('*** ROUTER: Current location:', location);
  }, [location]);

  // This is a debug component that doesn't render anything visible
  return null;
}
