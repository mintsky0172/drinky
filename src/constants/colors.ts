export const COLORS = {
  // Base 
  base: {
    creamPaper: "#FFFDF9",  
    warmBeige: "#E8DDD1",  
    white: "#FFFFFF",
  },

  // Primary 
  primary: {
    latte: "#C8A47E",      
    caramel: "#A47551",   
    espresso: "#590D0D",    
  },

  // Accent 
  accent: {
    water: "#A8D0E6",
    coffee: "#8B5E3C",
    strawberry: "#E89AAE",
    citrus: "#F4D35E",
  },

  // Status 
  status: {
    balanced: "#6BB775",
    low: "#FEDE0C",
    high: "#E54F12",
  },

  // UI Helpers
  ui: {
    // Borders / dividers
    border: "#D9C7B5",
    divider: "#E6D8CB",

    // Overlays
    overlayBrown40: "rgba(60, 40, 30, 0.4)",

    // Disabled
    disabledBg: "#E9E1D8",
    disabledText: "#A89A8F",
  },

  // Semantic aliases 
  semantic: {
    background: "#F5EFE6",
    surface: "#FFFFFF",
    surfaceAlt: "#E8DDD1",

    textPrimary: "#5A3E2B",
    textSecondary: "#7A5A45",
    textMuted: "#A89A8F",

    primary: "#C8A47E",
    primaryTextOn: "#FFFFFF",
    secondary: "#A47551",

    danger: "#C97C5D",
  },
} as const;

export type ColorKey =
  | keyof typeof COLORS
  | keyof typeof COLORS.base
  | keyof typeof COLORS.primary
  | keyof typeof COLORS.accent
  | keyof typeof COLORS.status
  | keyof typeof COLORS.ui
  | keyof typeof COLORS.semantic;