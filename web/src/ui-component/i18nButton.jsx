import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Avatar, Box, ButtonBase, Hidden, Menu, MenuItem, Typography } from '@mui/material';
import i18nList from 'i18n/i18nList';
import useI18n from 'hooks/useI18n';
import Flags from 'country-flag-icons/react/3x2';
import { Icon } from '@iconify/react';

export default function I18nButton() {
  const theme = useTheme();
  const i18n = useI18n();

  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    handleMenuClose();
  };

  // 获取当前语言的国家代码
  const getCurrentCountryCode = () => {
    const currentLang = i18n.language || 'zh_CN';
    const langItem = i18nList.find((item) => item.lng === currentLang) || i18nList[0];
    return langItem.countryCode;
  };

  // 动态获取当前语言的国旗组件
  const CurrentFlag = Flags[getCurrentCountryCode()];

  return (
    <Box
      sx={{
        ml: 2,
        mr: 3,
        [theme.breakpoints.down('md')]: {
          mr: 2
        }
      }}
    >
      <ButtonBase sx={{ borderRadius: '12px' }} onClick={handleMenuOpen}>
        <Avatar
          variant="rounded"
          sx={{
            ...theme.typography.commonAvatar,
            ...theme.typography.mediumAvatar,
            transition: 'all .2s ease-in-out',
            borderColor: 'transparent',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
            '&[aria-controls="menu-list-grow"],&:hover': {
              boxShadow: '0 0 10px rgba(0,0,0,0.2)',
              backgroundColor: 'transparent',
              borderRadius: '50%'
            }
          }}
          color="inherit"
        >
          {CurrentFlag ? (
            <Box
              sx={{
                width: '1.8rem',
                height: '1.4rem',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              <CurrentFlag style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </Box>
          ) : (
            <Icon 
              icon="solar:global-bold-duotone" 
              width="1.6rem" 
              color={theme.palette.mode === 'dark' ? theme.palette.text.primary : '#C08259'}
            />
          )}
        </Avatar>
      </ButtonBase>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center'
        }}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '8px',
            boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px 0 rgba(0,0,0,0.3)' : '0 2px 10px 0 rgba(0,0,0,0.12)',
            border: `1px solid ${theme.palette.divider}`,
            minWidth: '140px'
          }
        }}
      >
        {i18nList.map((item) => {
          const FlagComponent = Flags[item.countryCode];
          return (
            <MenuItem
              key={item.lng}
              onClick={() => handleLanguageChange(item.lng)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {FlagComponent ? (
                <Box
                  sx={{
                    width: '1.45rem',
                    height: '1.125rem',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  <FlagComponent style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </Box>
              ) : (
                <Icon 
                  icon="solar:global-bold-duotone" 
                  width="1.2rem" 
                  color={theme.palette.text.secondary}
                />
              )}
              <Typography variant="body1">{item.name}</Typography>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
