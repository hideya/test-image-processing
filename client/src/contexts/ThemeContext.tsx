import { createContext } from 'react';
import { THEME_COLORS } from '@/lib/theme-colors';

// Define the shape of your context
export interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
}

// Create context with default values
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Using the DEFAULT value from our themed colors
export const DEFAULT_COLOR = THEME_COLORS.RED.DEFAULT;
