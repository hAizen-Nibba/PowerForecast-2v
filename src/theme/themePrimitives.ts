export const brand = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
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
  800: '#1e293b',
  900: '#0f172a',
};

export const colorSchemes = {
  light: {
    palette: {
      primary: {
        light: brand[300],
        main: brand[600],
        dark: brand[800],
        contrastText: '#ffffff',
      },
      secondary: {
        light: secondaryBrand[300],
        main: secondaryBrand[500],
        dark: secondaryBrand[700],
        contrastText: '#000000',
      },
      info: {
        light: '#67e8f9',
        main: '#06b6d4',
        dark: '#0e7490',
        contrastText: '#ffffff',
      },
      warning: {
        light: '#fde047',
        main: '#eab308',
        dark: '#a16207',
      },
      error: {
        light: '#fca5a5',
        main: '#ef4444',
        dark: '#b91c1c',
      },
      success: {
        light: '#86efac',
        main: '#10b981',
        dark: '#047857',
      },
      grey: gray,
      divider: 'rgba(99, 102, 241, 0.15)',
      background: {
        default: '#f8faff',
        paper: '#ffffff',
      },
      text: {
        primary: '#100b46',
        secondary: '#4b5563',
        disabled: '#9ca3af',
      },
      action: {
        hover: 'rgba(99, 102, 241, 0.06)',
        selected: 'rgba(99, 102, 241, 0.12)',
      },
    },
  },
  dark: {
    palette: {
      primary: {
        light: brand[300],
        main: brand[400],
        dark: brand[700],
        contrastText: '#ffffff',
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
        light: '#34d399',
        main: '#10b981',
        dark: '#059669',
      },
      grey: gray,
      divider: 'rgba(129, 140, 248, 0.16)',
      background: {
        default: '#090938',
        paper: '#0f0e3a',
      },
      text: {
        primary: '#ffffff',
        secondary: '#94a3b8',
        disabled: '#64748b',
      },
      action: {
        hover: 'rgba(129, 140, 248, 0.12)',
        selected: 'rgba(129, 140, 248, 0.2)',
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
  borderRadius: 12,
};
