import { zinc, emerald } from './tokens';

export const brand = zinc;
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
export const gray = zinc;

export const colorSchemes = {
  light: {
    palette: {
      primary: {
        light: zinc[700],
        main: zinc[900],
        dark: zinc[950],
        contrastText: '#ffffff',
      },
      secondary: {
        light: zinc[500],
        main: zinc[700],
        dark: zinc[900],
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
        main: '#dc2626',
        dark: '#b91c1c',
        contrastText: '#ffffff',
      },
      success: {
        light: emerald[400],
        main: emerald[600],
        dark: emerald[700],
        contrastText: '#ffffff',
      },
      grey: zinc,
      divider: '#e4e4e7',
      background: {
        default: '#ffffff',
        paper: '#ffffff',
      },
      text: {
        primary: '#09090b',
        secondary: '#52525b',
        disabled: '#a1a1aa',
      },
      action: {
        hover: 'rgba(0, 0, 0, 0.04)',
        selected: 'rgba(0, 0, 0, 0.08)',
      },
    },
  },
  dark: {
    palette: {
      primary: {
        light: '#ffffff',
        main: zinc[50],
        dark: zinc[200],
        contrastText: '#09090b',
      },
      secondary: {
        light: zinc[300],
        main: zinc[400],
        dark: zinc[500],
        contrastText: '#09090b',
      },
      info: {
        light: '#38bdf8',
        main: '#0ea5e9',
        dark: '#0284c7',
      },
      warning: {
        light: '#fde047',
        main: '#f59e0b',
        dark: '#d97706',
      },
      error: {
        light: '#f87171',
        main: '#ef4444',
        dark: '#dc2626',
      },
      success: {
        light: emerald[300],
        main: emerald[400],
        dark: emerald[500],
        contrastText: '#09090b',
      },
      grey: zinc,
      divider: '#27272a',
      background: {
        default: '#09090b',
        paper: '#09090b',
      },
      text: {
        primary: '#fafafa',
        secondary: '#a1a1aa',
        disabled: '#71717a',
      },
      action: {
        hover: 'rgba(255, 255, 255, 0.05)',
        selected: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
};

export const typography = {
  fontFamily: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'].join(','),
  h1: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.025em',
  },
  h2: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
  },
  h3: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.015em',
  },
  h4: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: '-0.01em',
  },
  h5: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '1.1rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
  },
  h6: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '0.9375rem',
    fontWeight: 600,
    lineHeight: 1.45,
    letterSpacing: '-0.005em',
  },
  subtitle1: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '-0.01em',
  },
  subtitle2: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '-0.005em',
  },
  body1: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '0.875rem',
    lineHeight: 1.55,
    letterSpacing: '-0.005em',
  },
  body2: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '0.8125rem',
    lineHeight: 1.5,
    letterSpacing: '-0.005em',
  },
  button: {
    fontFamily: '"Inter", sans-serif',
    textTransform: 'none' as const,
    fontWeight: 500,
    letterSpacing: '-0.005em',
  },
};

export const shape = {
  borderRadius: 8,
};
