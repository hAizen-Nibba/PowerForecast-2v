import { Components, Theme } from '@mui/material/styles';

export const dataDisplayCustomizations: Components<Theme> = {
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 600,
        fontSize: '0.75rem',
        border: '1px solid transparent',
        transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
      sizeSmall: {
        borderRadius: 5,
        height: 22,
        fontSize: '0.6875rem',
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderColor: theme.palette.divider,
      }),
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderColor: theme.palette.divider,
        padding: '12px 16px',
        fontSize: '0.8125rem',
      }),
      head: ({ theme }: { theme: Theme }) => ({
        fontWeight: 700,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(23, 26, 31, 0.95)' 
          : '#f8fafc',
        color: theme.palette.text.secondary,
        textTransform: 'uppercase',
        fontSize: '0.6875rem',
        letterSpacing: '0.05em',
      }),
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#141619' : '#1e293b',
        color: '#ffffff',
        fontSize: '0.75rem',
        borderRadius: 8,
        padding: '6px 10px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.25)' : 'rgba(15, 23, 42, 0.1)'}`,
      }),
    },
  },
};
