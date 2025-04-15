// Define explicit theme colors with light and dark variants
// Ref: https://tailwindcss.com/docs/colors
export const THEME_COLORS = {
  RED: {
    name: 'Red',
    light: 'oklch(97.1% 0.013 17.38)',
    DEFAULT: 'oklch(80.8% 0.114 19.571)',
    dark: 'oklch(70.4% 0.191 22.216)',
  },
  ORANGE: {
    name: 'Orange',
    light: 'oklch(95.4% 0.038 75.164)',
    DEFAULT: 'oklch(90.1% 0.076 70.697)',
    dark: 'oklch(75% 0.183 55.934)',
  },
  EMERALD: {
    name: 'Emerald',
    light: 'oklch(97.9% 0.021 166.113)',
    DEFAULT: 'oklch(90.5% 0.093 164.15)',
    dark: 'oklch(76.5% 0.177 163.223)',
  },
  SKY: {
    name: 'Sky',
    light: 'oklch(95.1% 0.026 236.824)',
    DEFAULT: 'oklch(82.8% 0.111 230.318)',
    dark: 'oklch(74.6% 0.16 232.661)',
  },
  PURPLE: {
    name: 'Purple',
    light: 'oklch(94.6% 0.033 307.174)',
    DEFAULT: 'oklch(82.7% 0.119 306.383)',
    dark: 'oklch(71.4% 0.203 305.504)',
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
