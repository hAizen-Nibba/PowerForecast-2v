import { Components, Theme } from '@mui/material/styles';

export const navigationCustomizations: Components<Theme> = {
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        boxShadow: 'none',
        backgroundImage: 'none',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(9, 9, 56, 0.85)' 
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
      }),
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#050524' 
          : '#121350',
        color: '#ffffff',
        borderRight: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(129, 140, 248, 0.15)' 
            : 'rgba(255, 255, 255, 0.1)'
        }`,
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: theme.shape.borderRadius,
        margin: '2px 8px',
        padding: '8px 12px',
        transition: 'all 120ms ease-in',
        '&.Mui-selected': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(99, 102, 241, 0.25)' 
            : 'rgba(255, 255, 255, 0.15)',
          color: '#ffffff',
          fontWeight: 600,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(99, 102, 241, 0.35)' 
              : 'rgba(255, 255, 255, 0.22)',
          },
        },
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
      },
    },
  },
};
