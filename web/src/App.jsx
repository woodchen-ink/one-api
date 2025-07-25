import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { SET_THEME } from 'store/actions';
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
import { NoticeProvider, NoticeDialogs } from 'ui-component/notice';
import { SnackbarProvider } from 'notistack';
import CopySnackbar from 'ui-component/Snackbar';

// locales
import i18n from 'i18n/i18n';



// ==============================|| APP ||============================== //

const App = () => {
  const dispatch = useDispatch();
  const customization = useSelector((state) => state.customization);

  useEffect(() => {
    // 强制设置为浅色主题
    dispatch({ type: SET_THEME, theme: 'light' });
    localStorage.setItem('theme', 'light');
  }, [dispatch]);

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
                  <NoticeProvider>
                    <UserProvider>
                      <Routes />
                      <NoticeDialogs />
                    </UserProvider>
                  </NoticeProvider>
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
