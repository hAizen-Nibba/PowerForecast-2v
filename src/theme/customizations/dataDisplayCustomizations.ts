import { Components, Theme } from '@mui/material/styles';
import { zinc } from '../tokens';

export const dataDisplayCustomizations: Components<Theme> = {
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
        fontSize: '0.75rem',
        border: '1px solid transparent',
        transition: 'all 150ms ease',
      },
      sizeSmall: {
        borderRadius: 4,
        height: 20,
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
        padding: '10px 14px',
        fontSize: '0.8125rem',
      }),
      head: ({ theme }: { theme: Theme }) => ({
        fontWeight: 600,
        backgroundColor: theme.palette.mode === 'dark' 
          ? '#09090b' 
          : '#f4f4f5',
        color: theme.palette.text.secondary,
        textTransform: 'none',
        fontSize: '0.75rem',
        letterSpacing: 0,
      }),
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#18181b' : '#18181b',
        color: '#fafafa',
        fontSize: '0.75rem',
        borderRadius: 6,
        padding: '5px 8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
        border: `1px solid ${theme.palette.mode === 'dark' ? zinc[800] : zinc[700]}`,
      }),
    },
  },
};
