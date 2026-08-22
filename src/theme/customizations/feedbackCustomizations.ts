import { Components, Theme, alpha } from '@mui/material/styles';

export const feedbackCustomizations: Components<Theme> = {
  MuiAlert: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: theme.shape.borderRadius,
        fontSize: '0.8125rem',
        fontWeight: 500,
        alignItems: 'center',
      }),
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        height: 6,
        borderRadius: 3,
        backgroundColor: alpha(theme.palette.primary.main, 0.15),
      }),
      bar: {
        borderRadius: 3,
      },
    },
  },
};
