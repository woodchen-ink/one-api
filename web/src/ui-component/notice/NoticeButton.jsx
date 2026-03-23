import PropTypes from 'prop-types';
import { Avatar, Box, ButtonBase, Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NoticeButton({ sx }) {
  const theme = useTheme();
  const location = useLocation();
  const { t } = useTranslation();
  const isActive = location.pathname === '/notice';

  return (
    <Box sx={sx}>
      <Tooltip title={t('menu.notice', '公告')}>
        <ButtonBase component={Link} to="/notice" aria-label={t('menu.notice', '公告')} sx={{ borderRadius: '50%' }}>
          <Avatar
            variant="rounded"
            sx={{
              ...theme.typography.commonAvatar,
              ...theme.typography.mediumAvatar,
              ...theme.typography.menuButton,
              transition: 'all .2s ease-in-out',
              border: '1px solid',
              borderColor: isActive ? alpha(theme.palette.primary.main, 0.28) : 'transparent',
              backgroundColor: isActive ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1) : 'transparent',
              color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
              boxShadow: 'none',
              borderRadius: '50%',
              '&:hover': {
                boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.12)}`,
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.14),
                color: theme.palette.primary.main,
                borderRadius: '50%'
              }
            }}
            color="inherit"
          >
            <Icon icon="solar:bell-bing-bold-duotone" width="1.35rem" />
          </Avatar>
        </ButtonBase>
      </Tooltip>
    </Box>
  );
}

NoticeButton.propTypes = {
  sx: PropTypes.object
};
