import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
// routing
import Routes from 'routes';

// defaultTheme
import themes from 'themes';

// project imports
import NavigationScroll from 'layout/NavigationScroll';

// auth
import UserProvider from 'contexts/UserContext';
import StatusProvider from 'contexts/StatusContext';
import { SnackbarProvider } from 'notistack';
import CopySnackbar from 'ui-component/Snackbar';

// locales
import i18n from 'i18n/i18n';

// ==============================|| APP ||============================== //

const App = () => {
  const customization = useSelector((state) => state.customization);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', customization.theme);
  }, [customization.theme]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={themes(customization)}>
        <CssBaseline />
        <HelmetProvider>
          <NavigationScroll>
            <SnackbarProvider
              autoHideDuration={5000}
              maxSnack={3}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              Components={{ copy: CopySnackbar }}
            >
              <StatusProvider>
                <I18nextProvider i18n={i18n}>
                  <UserProvider>
                    <Routes />
                  </UserProvider>
                </I18nextProvider>
              </StatusProvider>
            </SnackbarProvider>
          </NavigationScroll>
        </HelmetProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
