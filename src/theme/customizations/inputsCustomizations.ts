import { Components, Theme, alpha } from '@mui/material/styles';
import { brand, gray } from '../themePrimitives';

export const inputsCustomizations: Components<Theme> = {
  MuiButtonBase: {
    defaultProps: {
      disableTouchRipple: true,
      disableRipple: true,
    },
    styleOverrides: {
      root: {
        boxSizing: 'border-box',
        transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:focus-visible': {
          outline: `3px solid ${alpha(brand[500], 0.5)}`,
          outlineOffset: '2px',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        boxShadow: 'none',
        borderRadius: 10,
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: 0,
        padding: '8px 16px',
        transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      }),
      contained: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.primary.main,
        color: '#ffffff',
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        },
      }),
      outlined: ({ theme }: { theme: Theme }) => ({
        borderColor: alpha(theme.palette.primary.main, 0.3),
        color: theme.palette.text.primary,
        '&:hover': {
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
      }),
      sizeSmall: {
        padding: '6px 12px',
        fontSize: '0.8125rem',
        borderRadius: 8,
      },
      sizeMedium: {
        padding: '8px 16px',
        fontSize: '0.875rem',
      },
      sizeLarge: {
        padding: '10px 20px',
        fontSize: '0.9375rem',
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        boxShadow: 'none',
        borderRadius: 10,
        color: theme.palette.text.secondary,
        transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.text.primary,
          transform: 'scale(1.05)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }),
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: 10,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 14, 58, 0.6)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: alpha(theme.palette.primary.main, 0.25),
        transition: 'border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(theme.palette.primary.main, 0.2),
          transition: 'border-color 180ms ease',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(theme.palette.primary.main, 0.45),
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: '2px',
        },
      }),
      input: {
        padding: '10px 14px',
        fontSize: '0.875rem',
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        width: 44,
        height: 24,
        padding: 0,
        display: 'flex',
      },
      switchBase: ({ theme }: { theme: Theme }) => ({
        padding: 2,
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&.Mui-checked': {
          transform: 'translateX(20px)',
          color: '#ffffff',
          '& + .MuiSwitch-track': {
            opacity: 1,
            backgroundColor: theme.palette.primary.main,
          },
        },
      }),
      thumb: {
        width: 20,
        height: 20,
        boxShadow: '0 2px 4px 0 rgba(0, 35, 11, 0.2)',
      },
      track: {
        borderRadius: 24 / 2,
        opacity: 1,
        backgroundColor: gray[600],
        boxSizing: 'border-box',
        transition: 'background-color 200ms ease',
      },
    },
  },
  MuiSlider: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        color: theme.palette.primary.main,
        height: 6,
        padding: '13px 0',
      }),
      thumb: {
        height: 18,
        width: 18,
        backgroundColor: '#ffffff',
        border: '2px solid currentColor',
        transition: 'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
          boxShadow: '0 0 0 8px rgba(99, 102, 241, 0.16)',
          transform: 'scale(1.15)',
        },
      },
      track: {
        height: 6,
        borderRadius: 3,
      },
      rail: {
        height: 6,
        borderRadius: 3,
        opacity: 0.3,
      },
    },
  },
};
