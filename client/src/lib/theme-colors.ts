// Define explicit theme colors with light and dark variants
export const THEME_COLORS = {
  CORAL: {
    name: 'Coral',
    light: 'rgb(252, 239, 240)',
    DEFAULT: 'rgb(231, 187, 190)',
    dark: 'rgb(229, 137, 143)',
  },
  GOLD: {
    name: 'Gold',
    light: 'rgb(251, 244, 232)',
    DEFAULT: 'rgb(252, 218, 152)',
    dark: 'rgb(254, 176, 18)',
  },
  TEAL: {
    name: 'Teal',
    light: 'rgb(237, 249, 241)',
    DEFAULT: 'rgb(141, 220, 169)',
    dark: 'rgb(70, 186, 110)',
  },
  BLUE: {
    name: 'Blue',
    light: 'rgb(232, 238, 249)',
    DEFAULT: 'rgb(159, 187, 235)',
    dark: 'rgb(78, 134, 230)',
  },
  PURPLE: {
    name: 'Purple',
    light: 'rgb(247, 237, 250)',
    DEFAULT: 'rgb(213, 154, 234)',
    dark: 'rgb(181, 85, 216)',
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
