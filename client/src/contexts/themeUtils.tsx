// Helper function to adjust color brightness
export function adjustBrightness(hex: string, percent: number): string {
  // Convert hex to RGB
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  // Adjust brightness
  r = Math.min(255, Math.max(0, r + (r * percent / 100)));
  g = Math.min(255, Math.max(0, g + (g * percent / 100)));
  b = Math.min(255, Math.max(0, b + (b * percent / 100)));

  // Convert back to hex
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

// Generate light and dark variants of a color
export function generateColorVariants(baseColor: string) {
  return {
    light: adjustBrightness(baseColor, 20),  // 20% lighter
    DEFAULT: baseColor,
    dark: adjustBrightness(baseColor, -20),  // 20% darker
  };
}
