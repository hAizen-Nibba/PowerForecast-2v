export const brand = {
  50: '#e6fffa',
  100: '#b2f5ea',
  200: '#81e6d9',
  300: '#4fd1c5',
  400: '#26c6da',
  500: '#00e5c9',
  600: '#00c4aa',
  700: '#009e88',
  800: '#007564',
  900: '#004d40',
};

export const secondaryBrand = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
};

export const gray = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e232a',
  900: '#14171c',
};

export const colorSchemes = {
  light: {
    palette: {
      primary: {
        light: '#14b8a6',
        main: '#0d9488',
        dark: '#0f766e',
        contrastText: '#ffffff',
      },
      secondary: {
        light: secondaryBrand[300],
        main: secondaryBrand[500],
        dark: secondaryBrand[700],
        contrastText: '#ffffff',
      },
      info: {
        light: '#38bdf8',
        main: '#0284c7',
        dark: '#0369a1',
        contrastText: '#ffffff',
      },
      warning: {
        light: '#fde047',
        main: '#d97706',
        dark: '#b45309',
        contrastText: '#ffffff',
      },
      error: {
        light: '#fca5a5',
        main: '#e11d48',
        dark: '#be123c',
        contrastText: '#ffffff',
      },
      success: {
        light: '#86efac',
        main: '#059669',
        dark: '#047857',
        contrastText: '#ffffff',
      },
      grey: gray,
      divider: '#e2e8f0',
      background: {
        default: '#f8fafc',
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a',
        secondary: '#475569',
        disabled: '#94a3b8',
      },
      action: {
        hover: 'rgba(13, 148, 136, 0.05)',
        selected: 'rgba(13, 148, 136, 0.1)',
      },
    },
  },
  dark: {
    palette: {
      primary: {
        light: brand[300],
        main: brand[500],
        dark: brand[700],
        contrastText: '#0c1b18',
      },
      secondary: {
        light: secondaryBrand[300],
        main: secondaryBrand[400],
        dark: secondaryBrand[600],
        contrastText: '#000000',
      },
      info: {
        light: '#22d3ee',
        main: '#06b6d4',
        dark: '#0891b2',
      },
      warning: {
        light: '#fcd34d',
        main: '#f59e0b',
        dark: '#d97706',
      },
      error: {
        light: '#f87171',
        main: '#ef4444',
        dark: '#dc2626',
      },
      success: {
        light: '#5df2d6',
        main: '#00e5c9',
        dark: '#00b39b',
      },
      grey: gray,
      divider: 'rgba(255, 255, 255, 0.08)',
      background: {
        default: '#17191d',
        paper: '#202328',
      },
      text: {
        primary: '#f1f5f9',
        secondary: '#8b949e',
        disabled: '#555d69',
      },
      action: {
        hover: 'rgba(0, 229, 201, 0.08)',
        selected: 'rgba(0, 229, 201, 0.16)',
      },
    },
  },
};

export const typography = {
  fontFamily: ['"Inter"', '"Roboto"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.015em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.35,
  },
  h5: {
    fontSize: '1.1rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '0.95rem',
    fontWeight: 600,
    lineHeight: 1.45,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '0.925rem',
    lineHeight: 1.55,
  },
  body2: {
    fontSize: '0.8125rem',
    lineHeight: 1.5,
  },
  button: {
    textTransform: 'none' as const,
    fontWeight: 600,
  },
};

export const shape = {
  borderRadius: 8,
};
