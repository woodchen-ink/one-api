import PropTypes from 'prop-types';
import { Icon } from '@iconify/react';
import { useLocation } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import { Box, IconButton, Stack, useMediaQuery } from '@mui/material';

// project imports
import LogoSection from '../LogoSection';
import Profile from './Profile';
import ThemeButton from 'ui-component/ThemeButton';
import I18nButton from 'ui-component/i18nButton';
import { NoticeButton } from 'ui-component/notice';

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

const Header = ({ handleLeftDrawerToggle, toggleProfileDrawer }) => {
  const theme = useTheme();
  const matchUpMd = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const isConsoleRoute = location.pathname.startsWith('/panel');

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          [theme.breakpoints.down('md')]: {
            width: 'auto'
          }
        }}
      >
        <Box component="span" sx={{ display: { xs: 'none', md: 'block' }, mr: 1 }}>
          <LogoSection />
        </Box>
        {!matchUpMd && (
          <IconButton
            size="medium"
            edge="start"
            color="inherit"
            onClick={handleLeftDrawerToggle}
            sx={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'
              }
            }}
          >
            <Icon icon="solar:hamburger-menu-linear" width={22} height={22} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      <Stack direction="row" spacing={1} alignItems="center">
        <NoticeButton />
        <ThemeButton />
        <I18nButton />
        {isConsoleRoute && <Profile toggleProfileDrawer={toggleProfileDrawer} />}
      </Stack>
    </>
  );
};

Header.propTypes = {
  handleLeftDrawerToggle: PropTypes.func,
  toggleProfileDrawer: PropTypes.func
};

export default Header;
