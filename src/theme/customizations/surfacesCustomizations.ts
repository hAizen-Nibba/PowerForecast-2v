import { Components, Theme } from '@mui/material/styles';

export const surfacesCustomizations: Components<Theme> = {
  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        padding: 16,
        gap: 16,
        transition: 'all 200ms ease-in-out',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(15, 14, 58, 0.8)' 
          : 'rgba(255, 255, 255, 0.95)',
        borderRadius: theme.shape.borderRadius,
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
            ? 'rgba(129, 140, 248, 0.35)' 
            : 'rgba(99, 102, 241, 0.3)',
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
        borderRadius: theme.shape.borderRadius,
      }),
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(15, 14, 58, 0.7)' 
          : 'rgba(255, 255, 255, 0.9)',
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(129, 140, 248, 0.15)' 
            : 'rgba(99, 102, 241, 0.15)'
        }`,
        borderRadius: `${Number(theme.shape.borderRadius) || 12}px !important`,
        marginBottom: 8,
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0 0 8px 0',
        },
      }),
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: {
        padding: '0 16px',
        fontWeight: 600,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        borderRadius: Number(theme.shape.borderRadius) * 1.5 || 18,
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#0c0a33' 
          : '#ffffff',
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(129, 140, 248, 0.25)' 
            : 'rgba(99, 102, 241, 0.2)'
        }`,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      }),
    },
  },
};
