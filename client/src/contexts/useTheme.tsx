import { useContext } from 'react';
import { ThemeContext, ThemeContextType, DEFAULT_COLOR } from './ThemeContext';

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    console.error("useTheme must be used within a ThemeProvider");
    return { themeColor: DEFAULT_COLOR, setThemeColor: () => {} };
  }
  return context;
}
