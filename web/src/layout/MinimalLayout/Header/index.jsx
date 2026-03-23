// material-ui
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Stack,
  Popper,
  IconButton,
  List,
  ListItemButton,
  Paper,
  ListItemText,
  Typography,
  Divider,
  ClickAwayListener
} from '@mui/material';
import LogoSection from 'layout/MainLayout/LogoSection';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HeaderActionButtons, HeaderDesktopNav, HeaderMobileMenuItems } from 'ui-component/header';
import { IconMenu2 } from '@tabler/icons-react';
import Transitions from 'ui-component/extended/Transitions';
import MainCard from 'ui-component/cards/MainCard';
import { useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';

// ==============================|| MINIMAL NAVBAR / HEADER ||============================== //

const Header = () => {
  const theme = useTheme();
  const { pathname } = useLocation();
  const account = useSelector((state) => state.account);
  const [open, setOpen] = useState(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  const handleOpenMenu = (event) => {
    setOpen(open ? null : event.currentTarget);
  };

  const handleCloseMenu = () => {
    setOpen(null);
  };

  return (
    <>
      <Box
        sx={{
          width: 228,
          display: 'flex',
          alignItems: 'center',
          [theme.breakpoints.down('md')]: {
            width: 'auto'
          }
        }}
      >
        <Box component="span" sx={{ display: 'block' }}>
          <LogoSection />
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1 }} />
      <Stack spacing={{ xs: 0.5, sm: 1, md: 2 }} direction="row" justifyContent="center" alignItems="center">
        {isMobile ? (
          <>
            <HeaderActionButtons mobile />
            <IconButton
              onClick={handleOpenMenu}
              sx={{
                color: theme.palette.text.primary,
                borderRadius: '12px',
                padding: '8px',
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
                }
              }}
            >
              <IconMenu2 stroke={1.5} size="1.3rem" />
            </IconButton>
          </>
        ) : (
          <>
            <HeaderDesktopNav showStatus />
            <HeaderActionButtons />
            {/* <Button
              component={Link}
              variant="text"
              to="/about"
              color={pathname === '/about' ? 'primary' : 'inherit'}
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none'
              }}
            >
            {t('menu.about')}
            </Button> */}
            {account.user ? (
              <Button
                component={Link}
                variant="contained"
                to="/panel"
                color="primary"
                sx={{
                  ml: 2,
                  px: 2,
                  height: '40px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'none'
                }}
              >
                {t('menu.console')}
              </Button>
            ) : (
              <Button
                component={Link}
                variant="contained"
                to="/login"
                color="primary"
                sx={{
                  ml: 2,
                  px: 2.5,
                  height: '40px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'none'
                }}
              >
                {t('menu.login')}
              </Button>
            )}
          </>
        )}
      </Stack>

      <Popper
        open={!!open}
        anchorEl={open}
        transition
        disablePortal
        placement="bottom-end"
        popperOptions={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 14]
              }
            }
          ]
        }}
        style={{ zIndex: theme.zIndex.drawer + 2 }}
      >
        {({ TransitionProps }) => (
          <Transitions in={open} {...TransitionProps}>
            <ClickAwayListener onClickAway={handleCloseMenu}>
              <Paper
                sx={{
                  width: { xs: '30vw', sm: '320px' },
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: theme.shadows[8],
                  textAlign: 'center'
                }}
              >
                <MainCard border={false} elevation={0} content={false} boxShadow>
                  <List
                    component="nav"
                    sx={{
                      width: '100%',
                      backgroundColor: theme.palette.background.paper,
                      py: 1,
                      '& .MuiListItemButton-root': {
                        py: 0.75,
                        px: 2.5,
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                        }
                      },
                      '& .Mui-selected': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                        }
                      }
                    }}
                    onClick={handleCloseMenu}
                  >
                    <HeaderMobileMenuItems showStatus showAbout />
                    <Divider sx={{ my: 1 }} />
                    {account.user ? (
                      <ListItemButton
                        component={Link}
                        to="/panel"
                        sx={{
                          fontWeight: pathname === '/panel' ? 500 : 400,
                          color: pathname === '/panel' ? theme.palette.primary.main : theme.palette.text.primary
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              color="primary"
                              variant="body1"
                              sx={{
                                fontWeight: 600,
                                textAlign: 'center',
                                transition: 'color 0.2s ease'
                              }}
                            >
                              {t('menu.console')}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    ) : (
                      <ListItemButton
                        component={Link}
                        to="/login"
                        sx={{
                          fontWeight: pathname === '/login' ? 500 : 400,
                          color: pathname === '/login' ? theme.palette.primary.main : theme.palette.text.primary
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              color="primary"
                              variant="body1"
                              sx={{
                                fontWeight: 600,
                                textAlign: 'center',
                                transition: 'color 0.2s ease'
                              }}
                            >
                              {t('menu.login')}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    )}
                  </List>
                </MainCard>
              </Paper>
            </ClickAwayListener>
          </Transitions>
        )}
      </Popper>
    </>
  );
};

export default Header;
