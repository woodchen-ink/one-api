import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, ButtonBase, Menu, MenuItem, Typography } from '@mui/material';
import { Icon } from '@iconify/react';

import i18nList, { getLanguageOption, normalizeLanguage } from 'i18n/i18nList';
import useI18n from 'hooks/useI18n';

export default function I18nButton({ sx }) {
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
    i18n.changeLanguage(normalizeLanguage(lng));
    handleMenuClose();
  };

  const currentLanguage = getLanguageOption(i18n.language);
  const currentLanguageKey = currentLanguage.lng;

  return (
    <Box
      sx={{
        ml: 2,
        mr: 3,
        [theme.breakpoints.down('md')]: {
          mr: 2
        },
        ...sx
      }}
    >
      <ButtonBase sx={{ borderRadius: '999px' }} onClick={handleMenuOpen}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 0.75,
            borderRadius: '999px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : theme.palette.background.paper,
            transition: 'all .2s ease-in-out',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.palette.action.hover,
              boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0, 0, 0, 0.24)' : '0 6px 18px rgba(15, 23, 42, 0.08)'
            }
          }}
        >
          <Icon icon="solar:global-linear" width="1.1rem" color={theme.palette.text.secondary} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              lineHeight: 1
            }}
          >
            {currentLanguage.name}
          </Typography>
          <Box
            sx={{
              minWidth: 30,
              px: 0.75,
              py: 0.25,
              borderRadius: '999px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.14)' : 'rgba(25, 118, 210, 0.1)'
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 700,
                textAlign: 'center',
                color: theme.palette.primary.main,
                lineHeight: 1.2
              }}
            >
              {currentLanguage.shortName}
            </Typography>
          </Box>
          <Icon icon="solar:alt-arrow-down-linear" width="0.95rem" color={theme.palette.text.secondary} />
        </Box>
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
            borderRadius: '12px',
            boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px 0 rgba(0,0,0,0.3)' : '0 2px 10px 0 rgba(0,0,0,0.12)',
            border: `1px solid ${theme.palette.divider}`,
            minWidth: '180px'
          }
        }}
      >
        {i18nList.map((item) => {
          const selected = item.lng === currentLanguageKey;

          return (
            <MenuItem
              key={item.lng}
              onClick={() => handleLanguageChange(item.lng)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 1,
                px: 1.25
              }}
            >
              <Box
                sx={{
                  minWidth: 36,
                  px: 1,
                  py: 0.5,
                  borderRadius: '8px',
                  backgroundColor: selected
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(144, 202, 249, 0.16)'
                      : 'rgba(25, 118, 210, 0.12)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(15, 23, 42, 0.05)'
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
                    lineHeight: 1.2
                  }}
                >
                  {item.shortName}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: selected ? 600 : 500,
                    color: theme.palette.text.primary
                  }}
                >
                  {item.name}
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {item.lng.replace('_', '-')}
                </Typography>
              </Box>
              {selected && <Icon icon="solar:check-circle-bold" width="1rem" color={theme.palette.primary.main} />}
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}

I18nButton.propTypes = {
  sx: PropTypes.object
};
