import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { colorSchemes, typography, shape } from './themePrimitives';
import { inputsCustomizations } from './customizations/inputsCustomizations';
import { surfacesCustomizations } from './customizations/surfacesCustomizations';
import { dataDisplayCustomizations } from './customizations/dataDisplayCustomizations';
import { feedbackCustomizations } from './customizations/feedbackCustomizations';
import { navigationCustomizations } from './customizations/navigationCustomizations';

interface AppThemeProps {
  children: React.ReactNode;
  mode?: 'light' | 'dark';
}

export const ColorModeContext = React.createContext<{
  mode: 'light' | 'dark';
  toggleColorMode: () => void;
}>({
  mode: 'dark',
  toggleColorMode: () => {},
});

export const useColorMode = () => React.useContext(ColorModeContext);

export function AppTheme({ children, mode: controlledMode }: AppThemeProps) {
  const [mode, setMode] = React.useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('powerforecast_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  const activeMode = controlledMode || mode;

  const toggleColorMode = React.useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('powerforecast_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      if (next === 'dark') {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeMode);
    if (activeMode === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [activeMode]);

  const theme = React.useMemo(() => {
    const scheme = activeMode === 'dark' ? colorSchemes.dark : colorSchemes.light;
    return createTheme({
      palette: {
        mode: activeMode,
        ...scheme.palette,
      },
      typography,
      shape,
      components: {
        ...inputsCustomizations,
        ...surfacesCustomizations,
        ...dataDisplayCustomizations,
        ...feedbackCustomizations,
        ...navigationCustomizations,
      },
    });
  }, [activeMode]);

  const contextValue = React.useMemo(
    () => ({
      mode: activeMode,
      toggleColorMode,
    }),
    [activeMode, toggleColorMode]
  );

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default AppTheme;
