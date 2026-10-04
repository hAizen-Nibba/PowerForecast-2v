import { Components, Theme } from '@mui/material/styles';
import { zinc } from '../tokens';

export const navigationCustomizations: Components<Theme> = {
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        boxShadow: 'none',
        backgroundImage: 'none',
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#09090b' 
          : '#ffffff',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }),
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#09090b' 
          : '#ffffff',
        color: theme.palette.text.primary,
        borderRight: `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
        transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: 6,
        margin: '2px 8px',
        padding: '7px 10px',
        transition: 'background-color 150ms ease, color 150ms ease',
        '&.Mui-selected': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? zinc[800] 
            : zinc[100],
          color: theme.palette.text.primary,
          fontWeight: 600,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? zinc[700] 
              : zinc[200],
          },
        },
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        },
      }),
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: ({ theme }: { theme: Theme }) => ({
        height: 2,
        backgroundColor: theme.palette.primary.main,
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }),
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.875rem',
        minHeight: 40,
        padding: '6px 14px',
        transition: 'color 150ms ease',
      },
    },
  },
};
