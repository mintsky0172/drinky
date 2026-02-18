export const TYPOGRAPHY = {
  fontFamily: {
    // Expo(React Native)에서는 로드한 fontFamily 이름을 그대로 써야 해요.
    title: "Iseoyun",
    body: "System", // iOS: SF Pro (system), Android: Roboto (system)
    mono: "Menlo", // optional (iOS), Android: monospace
  },

  // Font sizes (pt)
  size: {
    display: 34, // Splash / big hero
    h1: 28, // Page title (마이페이지, 캘린더 등)
    h2: 22, // Section title (오늘 마신 음료, 오늘의 섭취량)
    h3: 18, // Card title / List title
    body: 16, // Default body
    bodySmall: 14, // Secondary text
    caption: 12, // Hint / meta
  },

  // Line heights
  lineHeight: {
    display: 40,
    h1: 34,
    h2: 28,
    h3: 24,
    body: 22,
    bodySmall: 20,
    caption: 16,
    micro: 14,
  },

  // Font weights
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  } as const,

  // Letter spacing
  letterSpacing: {
    tight: -0.2,
    normal: 0,
    wide: 0.2,
  },

  // Ready-to-use text styles
  preset: {
    display: {
      fontFamily: "Iseoyun",
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.2,
    },
    h1: {
      fontFamily: "Iseoyun",
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.2,
    },
    h2: {
      fontFamily: "Iseoyun",
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.1,
    },
    h3: {
      fontFamily: "Iseoyun",
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: 0,
    },

    body: {
      fontFamily: "Iseoyun",
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
    },
    bodyMedium: {
      fontFamily: "System",
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
      fontWeight: "500",
    },
    bodySmall: {
      fontFamily: "System",
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
    },
    caption: {
      fontFamily: "Iseoyun",
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.2,
    },

    numberLg: {
      fontFamily: "Iseoyun",
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.2,
      fontWeight: "700",
    },
    numberMd: {
      fontFamily: "Iseoyun",
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: -0.1,
      fontWeight: "700",
    },
    numberSm: {
      fontFamily: "Iseoyun",
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
      fontWeight: "600",
    },

    // Buttons
    button: {
      fontFamily: "Iseoyun",
      fontSize: 20,
      lineHeight: 20,
      letterSpacing: 0.2,
      fontWeight: "600",
    },
    buttonSmall: {
      fontFamily: "Iseoyun",
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: 0.2,
      fontWeight: "600",
    },
  },
} as const;

export type TypographyPresetKey = keyof typeof TYPOGRAPHY.preset;
