import { Components, Theme } from '@mui/material/styles';

export const surfacesCustomizations: Components<Theme> = {
  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        padding: 20,
        gap: 16,
        transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(15, 14, 58, 0.82)' 
          : 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(129, 140, 248, 0.18)' 
            : 'rgba(99, 102, 241, 0.16)'
        }`,
        backdropFilter: 'blur(16px)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 4px 24px rgba(0, 0, 0, 0.35)'
          : '0 4px 20px rgba(99, 102, 241, 0.08)',
        '&:hover': {
          borderColor: theme.palette.mode === 'dark' 
            ? 'rgba(129, 140, 248, 0.38)' 
            : 'rgba(99, 102, 241, 0.32)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.45)'
            : '0 8px 28px rgba(99, 102, 241, 0.12)',
        },
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundImage: 'none',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(15, 14, 58, 0.9)' 
          : '#ffffff',
        borderRadius: 14,
        transition: 'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
      }),
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(15, 14, 58, 0.72)' 
          : 'rgba(255, 255, 255, 0.92)',
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(129, 140, 248, 0.16)' 
            : 'rgba(99, 102, 241, 0.15)'
        }`,
        borderRadius: '14px !important',
        marginBottom: 10,
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0 0 10px 0',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(129, 140, 248, 0.35)' : 'rgba(99, 102, 241, 0.3)',
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
        borderRadius: 20,
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#0c0a33' 
          : '#ffffff',
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(129, 140, 248, 0.25)' 
            : 'rgba(99, 102, 241, 0.2)'
        }`,
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(20px)',
      }),
    },
  },
};
