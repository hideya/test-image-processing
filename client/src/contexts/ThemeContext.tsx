import { createContext } from 'react';

// Define the shape of your context
export interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
}

// Create context with default values
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const DEFAULT_COLOR = '#3b82f6';
