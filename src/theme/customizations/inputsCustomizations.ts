import { Components, Theme, alpha } from '@mui/material/styles';
import { zinc, emerald } from '../tokens';

export const inputsCustomizations: Components<Theme> = {
  MuiButtonBase: {
    defaultProps: {
      disableTouchRipple: true,
      disableRipple: true,
    },
    styleOverrides: {
      root: {
        boxSizing: 'border-box',
        transition: 'all 150ms ease',
        '&:focus-visible': {
          outline: `2px solid ${zinc[400]}`,
          outlineOffset: '2px',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: () => ({
        boxShadow: 'none',
        borderRadius: 6,
        textTransform: 'none',
        fontWeight: 500,
        letterSpacing: '-0.005em',
        padding: '8px 16px',
        transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
        '&:hover': {
          boxShadow: 'none',
        },
        '&:active': {
          transform: 'none',
        },
      }),
      contained: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? zinc[50] : zinc[900],
        color: theme.palette.mode === 'dark' ? zinc[900] : '#ffffff',
        fontWeight: 600,
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? zinc[200] : zinc[800],
        },
      }),
      outlined: ({ theme }: { theme: Theme }) => ({
        borderColor: theme.palette.mode === 'dark' ? zinc[800] : zinc[200],
        color: theme.palette.text.primary,
        backgroundColor: 'transparent',
        '&:hover': {
          borderColor: theme.palette.mode === 'dark' ? zinc[700] : zinc[300],
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        },
      }),
      text: ({ theme }: { theme: Theme }) => ({
        color: theme.palette.text.secondary,
        '&:hover': {
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        },
      }),
      sizeSmall: {
        padding: '6px 12px',
        fontSize: '0.8125rem',
        borderRadius: 6,
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
        borderRadius: 6,
        color: theme.palette.text.secondary,
        transition: 'background-color 150ms ease, color 150ms ease',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
          color: theme.palette.text.primary,
        },
      }),
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: 6,
        backgroundColor: theme.palette.mode === 'dark' ? '#09090b' : '#ffffff',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.mode === 'dark' ? zinc[800] : zinc[200],
          transition: 'border-color 150ms ease',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.mode === 'dark' ? zinc[700] : zinc[300],
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.mode === 'dark' ? zinc[400] : zinc[600],
          borderWidth: '1px',
        },
      }),
      input: {
        padding: '9px 13px',
        fontSize: '0.875rem',
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        width: 42,
        height: 24,
        padding: 0,
        display: 'flex',
      },
      switchBase: ({ theme }: { theme: Theme }) => ({
        padding: 2,
        transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&.Mui-checked': {
          transform: 'translateX(18px)',
          color: '#ffffff',
          '& + .MuiSwitch-track': {
            opacity: 1,
            backgroundColor: theme.palette.mode === 'dark' ? emerald[500] : emerald[600],
          },
        },
      }),
      thumb: {
        width: 20,
        height: 20,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
      },
      track: {
        borderRadius: 24 / 2,
        opacity: 1,
        backgroundColor: zinc[700],
        boxSizing: 'border-box',
        transition: 'background-color 180ms ease',
      },
    },
  },
  MuiSlider: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        color: theme.palette.mode === 'dark' ? emerald[400] : emerald[600],
        height: 4,
        padding: '12px 0',
      }),
      thumb: {
        height: 16,
        width: 16,
        backgroundColor: '#ffffff',
        border: '2px solid currentColor',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'box-shadow 150ms ease, transform 150ms ease',
        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
          boxShadow: '0 0 0 6px rgba(16, 185, 129, 0.15)',
        },
      },
      track: {
        height: 4,
        borderRadius: 2,
      },
      rail: {
        height: 4,
        borderRadius: 2,
        opacity: 0.25,
      },
    },
  },
};
