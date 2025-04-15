import React, { useState, useEffect } from 'react';
import { ThemeContext, DEFAULT_COLOR } from './ThemeContext';
import { getColorVariants } from '@/lib/theme-colors';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState(() => {
    const savedColor = localStorage.getItem('themeColor');
    return savedColor || DEFAULT_COLOR;
  });
  
  useEffect(() => {
    localStorage.setItem('themeColor', themeColor);
    
    const variants = getColorVariants(themeColor);
    document.documentElement.style.setProperty('--theme-color', variants.DEFAULT);
    document.documentElement.style.setProperty('--theme-color-light', variants.light);
    document.documentElement.style.setProperty('--theme-color-dark', variants.dark);
    
    document.body.style.backgroundColor = variants.light;
  }, [themeColor]);
  
  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
