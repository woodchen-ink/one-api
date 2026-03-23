import PropTypes from 'prop-types';
import { Avatar, Box, ButtonBase, Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import SvgColor from 'ui-component/SvgColor';

const CUSTOMER_SERVICE_URL = 'https://work.weixin.qq.com/kfid/kfce787ac8bbad50026';
const WECHAT_ICON_URL = 'https://i.czl.net/b2/img/69c171f05c5d4.svg';

export function CustomerServiceButton({ sx }) {
  const theme = useTheme();

  return (
    <Box sx={sx}>
      <Tooltip title="微信客服">
        <ButtonBase
          component="a"
          href={CUSTOMER_SERVICE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="微信客服"
          sx={{ borderRadius: '50%' }}
        >
          <Avatar
            variant="rounded"
            sx={{
              ...theme.typography.commonAvatar,
              ...theme.typography.mediumAvatar,
              ...theme.typography.menuButton,
              transition: 'all .2s ease-in-out',
              border: '1px solid',
              borderColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.32 : 0.18),
              backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.18 : 0.08),
              color: theme.palette.success.main,
              boxShadow: 'none',
              borderRadius: '50%',
              '&:hover': {
                boxShadow: `0 6px 16px ${alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.18 : 0.14)}`,
                backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.26 : 0.14),
                color: theme.palette.success.main,
                borderRadius: '50%'
              }
            }}
            color="inherit"
          >
            <SvgColor src={WECHAT_ICON_URL} sx={{ width: '1.15rem', height: '1.15rem' }} />
          </Avatar>
        </ButtonBase>
      </Tooltip>
    </Box>
  );
}

CustomerServiceButton.propTypes = {
  sx: PropTypes.object
};
