// Define explicit theme colors with light and dark variants
export const THEME_COLORS = {
  // Coral/Salmon pink
  '#ee8c8c': {
    light: '#f5b1b1',
    DEFAULT: '#ee8c8c',
    dark: '#d26262'
  },
  // Golden yellow
  '#eec500': {
    light: '#f5d792',
    DEFAULT: '#eec500', 
    dark: '#d5a83a'
  },
  // Teal/Mint green
  '#6ed0b4': {
    light: '#9edfd3',
    DEFAULT: '#6ed0b4',
    dark: '#4a9e8f'
  },
  // Light blue
  '#80b0ff': {
    light: '#9cc7e3',
    DEFAULT: '#80b0ff',
    dark: '#4781a7'
  },
  // Default blue (for compatibility with existing data)
  '#3b82f6': {
    light: '#60a5fa',
    DEFAULT: '#3b82f6',
    dark: '#2563eb'
  }
};

// Get color variants for a given theme color
export function getColorVariants(color: string) {
  // Check if the color exists in our predefined colors
  if (THEME_COLORS[color]) {
    return THEME_COLORS[color];
  }

  // Fallback to the default blue theme if the color isn't in our list
  return THEME_COLORS['#3b82f6'];
}
