import { Components, Theme } from '@mui/material/styles';

export const navigationCustomizations: Components<Theme> = {
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        boxShadow: 'none',
        backgroundImage: 'none',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(23, 25, 29, 0.92)' 
          : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        transition: 'background-color 240ms ease, border-color 240ms ease',
      }),
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#141619' 
          : '#ffffff',
        color: theme.palette.text.primary,
        borderRight: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : '#e2e8f0'
        }`,
        boxShadow: theme.palette.mode === 'dark'
          ? 'none'
          : '2px 0 16px rgba(15, 23, 42, 0.03)',
        transition: 'width 240ms cubic-bezier(0.4, 0, 0.2, 1)',
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: 8,
        margin: '3px 8px',
        padding: '8px 12px',
        transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&.Mui-selected': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(0, 229, 201, 0.15)' 
            : 'rgba(13, 148, 136, 0.1)',
          color: theme.palette.mode === 'dark' ? '#00e5c9' : '#0f766e',
          fontWeight: 600,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(0, 229, 201, 0.22)' 
              : 'rgba(13, 148, 136, 0.15)',
          },
        },
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
          transform: 'translateX(2px)',
        },
      }),
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: ({ theme }: { theme: Theme }) => ({
        height: 3,
        borderRadius: '3px 3px 0 0',
        backgroundColor: theme.palette.primary.main,
        transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)',
      }),
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        minHeight: 44,
        padding: '8px 16px',
        transition: 'color 180ms ease, opacity 180ms ease',
      },
    },
  },
};
