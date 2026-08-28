import { Components, Theme } from '@mui/material/styles';

export const surfacesCustomizations: Components<Theme> = {
  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        padding: 20,
        gap: 16,
        transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(32, 35, 40, 0.88)' 
          : '#ffffff',
        borderRadius: 12,
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : '#e2e8f0'
        }`,
        backdropFilter: 'blur(16px)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 4px 24px rgba(0, 0, 0, 0.45)'
          : '0 2px 10px rgba(15, 23, 42, 0.04)',
        '&:hover': {
          borderColor: theme.palette.mode === 'dark' 
            ? 'rgba(0, 229, 201, 0.35)' 
            : 'rgba(13, 148, 136, 0.35)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.55), 0 0 16px rgba(0, 229, 201, 0.06)'
            : '0 8px 24px rgba(15, 23, 42, 0.08)',
        },
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundImage: 'none',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(32, 35, 40, 0.92)' 
          : '#ffffff',
        borderRadius: 10,
        transition: 'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
      }),
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(32, 35, 40, 0.75)' 
          : '#ffffff',
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : '#e2e8f0'
        }`,
        borderRadius: '10px !important',
        marginBottom: 10,
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0 0 10px 0',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.4)' : 'rgba(13, 148, 136, 0.4)',
        },
      }),
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: {
        padding: '0 18px',
        minHeight: 52,
        fontWeight: 600,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        borderRadius: 14,
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#1b1e22' 
          : '#ffffff',
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.12)' 
            : '#e2e8f0'
        }`,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 24px 64px rgba(0, 0, 0, 0.65)' 
          : '0 24px 64px rgba(15, 23, 42, 0.12)',
        backdropFilter: 'blur(20px)',
      }),
    },
  },
};
