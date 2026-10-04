import { Components, Theme } from '@mui/material/styles';

export const surfacesCustomizations: Components<Theme> = {
  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        padding: 24,
        gap: 16,
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#09090b' 
          : '#ffffff',
        borderRadius: 8,
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? '#27272a' 
            : '#e4e4e7'
        }`,
        backgroundImage: 'none',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        '&:hover': {
          borderColor: theme.palette.mode === 'dark' 
            ? '#3f3f46' 
            : '#d4d4d8',
        },
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundImage: 'none',
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#09090b' 
          : '#ffffff',
        borderRadius: 8,
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? '#27272a' 
            : '#e4e4e7'
        }`,
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }),
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#09090b' 
          : '#ffffff',
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? '#27272a' 
            : '#e4e4e7'
        }`,
        borderRadius: '8px !important',
        marginBottom: 8,
        backgroundImage: 'none',
        transition: 'border-color 150ms ease',
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0 0 8px 0',
          borderColor: theme.palette.mode === 'dark' ? '#3f3f46' : '#d4d4d8',
        },
      }),
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: {
        padding: '0 16px',
        minHeight: 48,
        fontWeight: 600,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        borderRadius: 12,
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#09090b' 
          : '#ffffff',
        border: `1px solid ${
          theme.palette.mode === 'dark' 
            ? '#27272a' 
            : '#e4e4e7'
        }`,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)' 
          : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        backgroundImage: 'none',
      }),
    },
  },
};
