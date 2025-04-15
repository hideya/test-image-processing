// Define explicit theme colors with light and dark variants
export const THEME_COLORS = {
  CORAL: {
    name: 'Coral',
    light: '#f5b1b1',
    DEFAULT: '#ee8c8c',
    dark: '#d26262'
  },
  GOLD: {
    name: 'Gold',
    light: '#f5d792',
    DEFAULT: '#eec500', 
    dark: '#d5a83a'
  },
  TEAL: {
    name: 'Teal',
    light: '#9edfd3',
    DEFAULT: '#6ed0b4',
    dark: '#4a9e8f'
  },
  BLUE: {
    name: 'Blue',
    light: '#9cc7e3',
    DEFAULT: '#80b0ff',
    dark: '#4781a7'
  },
  PURPLE: {
    name: 'Purple',
    light: '#c9a8f7',
    DEFAULT: '#a77bf3',
    dark: '#8152d0'
  }
};

// Helper to create a mapping of color values to their full color objects
const colorMap = new Map();

// Initialize the color map
Object.values(THEME_COLORS).forEach(colorObj => {
  colorMap.set(colorObj.DEFAULT, colorObj);
});

// Get color variants for a given theme color
export function getColorVariants(color: string) {
  // Check if the color exists in our predefined colors map
  if (colorMap.has(color)) {
    return colorMap.get(color);
  }

  // Fallback to the default blue theme if the color isn't in our list
  return THEME_COLORS.BLUE;
}
