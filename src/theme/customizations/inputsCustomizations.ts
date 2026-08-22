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
        transition: 'all 120ms ease-in',
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
        borderRadius: theme.shape.borderRadius,
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: 0,
        padding: '8px 16px',
        '&:hover': {
          boxShadow: 'none',
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
        borderRadius: theme.shape.borderRadius,
        color: theme.palette.text.secondary,
        transition: 'all 120ms ease-in',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.text.primary,
        },
      }),
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: theme.shape.borderRadius,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 14, 58, 0.6)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: alpha(theme.palette.primary.main, 0.25),
        transition: 'border-color 120ms ease-in, box-shadow 120ms ease-in',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(theme.palette.primary.main, 0.2),
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
      },
    },
  },
  MuiSlider: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        color: theme.palette.primary.main,
        height: 6,
      }),
      thumb: {
        height: 18,
        width: 18,
        backgroundColor: '#ffffff',
        border: '2px solid currentColor',
        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
          boxShadow: 'inherit',
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
