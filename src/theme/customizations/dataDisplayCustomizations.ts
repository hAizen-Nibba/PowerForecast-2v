import { Components, Theme, alpha } from '@mui/material/styles';

export const dataDisplayCustomizations: Components<Theme> = {
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 9999,
        fontWeight: 600,
        fontSize: '0.75rem',
        border: '1px solid transparent',
      },
      sizeSmall: {
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
          ? 'rgba(15, 14, 58, 0.95)' 
          : 'rgba(240, 243, 255, 0.95)',
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
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1b4b' : '#1e293b',
        color: '#ffffff',
        fontSize: '0.75rem',
        borderRadius: 8,
        padding: '6px 10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }),
    },
  },
};
