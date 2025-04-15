import React from 'react';

interface LoadingScreenProps {
  /**
   * Whether to show the loading screen
   */
  show: boolean;
  
  /**
   * Optional text to show below the spinner
   */
  text?: string;
  
  /**
   * Optional logo or branding image URL
   */
  logoUrl?: string;
}

export function LoadingScreen({
  show,
  text = 'Loading your data...',
  logoUrl,
}: LoadingScreenProps) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-white dark:bg-stone-900 z-50 flex flex-col items-center justify-center transition-opacity duration-300 ease-in-out">
      <div className="flex flex-col items-center space-y-8 px-4 text-center">
        {logoUrl ? (
          <div className="mb-4 animate-fade-in">
            <img
              src={logoUrl}
              alt="App Logo"
              className="h-20 w-auto"
            />
          </div>
        ) : (
          <div className="mb-4 text-3xl font-bold text-theme animate-fade-in">
            Photo Analyzer
          </div>
        )}
        
        <div className="h-14 w-14 rounded-full border-4 border-theme border-t-transparent animate-spin"></div>
        
        <div className="text-center animate-fade-in">
          <h2 className="text-xl font-medium text-theme-dark dark:text-stone-200">
            {text}
          </h2>
          <p className="mt-2 text-sm text-theme-dark dark:text-stone-400">
            Please wait while we prepare everything for you
          </p>
        </div>
      </div>
    </div>
  );
}
