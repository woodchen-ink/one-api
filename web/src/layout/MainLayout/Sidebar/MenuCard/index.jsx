import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';

// material-ui
import { styled, useTheme, alpha } from '@mui/material/styles';
import { Avatar, Card, CardContent, Box, Typography, Chip, LinearProgress, Stack, Tooltip, Button } from '@mui/material';
import User1 from 'assets/images/users/user-round.svg';
import { useNavigate } from 'react-router-dom';
import { IconHeadset } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { UserContext } from 'contexts/UserContext';
import { Icon } from '@iconify/react';

const CardStyle = styled(Card)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(8px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  marginBottom: '22px',
  overflow: 'hidden',
  position: 'relative',
  borderRadius: 12,
  boxShadow: theme.palette.mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 16px rgba(149, 157, 165, 0.1)',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: '120px',
    height: '120px',
    background: alpha(theme.palette.primary.main, 0.08),
    borderRadius: '50%',
    top: '-60px',
    right: '-30px',
    zIndex: 0
  }
}));

const ProgressBarWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: 6,
  borderRadius: 6,
  overflow: 'hidden',
  backgroundColor: alpha(theme.palette.divider, 0.1),
  '& .MuiLinearProgress-root': {
    height: '100%',
    borderRadius: 6,
    backgroundColor: 'transparent',
    '& .MuiLinearProgress-bar': {
      borderRadius: 6
    }
  }
}));

const InfoChip = styled(Chip)(() => ({
  height: '18px',
  fontSize: '0.65rem',
  fontWeight: 600,
  borderRadius: '4px',
  '& .MuiChip-label': {
    padding: '0 6px'
  }
}));

// ==============================|| SIDEBAR MENU Card ||============================== //

const MenuCard = () => {
  const theme = useTheme();
  const account = useSelector((state) => state.account);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [balance, setBalance] = useState(0);
  const [usedQuota, setUsedQuota] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const { userGroup } = useContext(UserContext);

  const quotaPerUnit = localStorage.getItem('quota_per_unit') || 500000;

  const totalQuota = parseFloat(balance) + parseFloat(usedQuota);
  const progressValue = (parseFloat(usedQuota) / totalQuota) * 100;

  useEffect(() => {
    if (account && account.user) {
      setBalance(((account.user.quota || 0) / quotaPerUnit).toFixed(2));
      setUsedQuota(((account.user.used_quota || 0) / quotaPerUnit).toFixed(2));
      setRequestCount(account.user.request_count || 0);
    }
  }, [account, quotaPerUnit]);

  const getProgressColor = () => {
    if (progressValue < 60) return theme.palette.success.main;
    if (progressValue < 85) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <CardStyle>
      <CardContent sx={{ p: 1.5, pb: '8px !important' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <Avatar
            src={account.user?.avatar_url || User1}
            sx={{
              width: 36,
              height: 36,
              cursor: 'pointer',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              '&:hover': {
                borderColor: theme.palette.primary.main
              }
            }}
            onClick={() => navigate('/panel/profile')}
          />

          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: '0.875rem',
                lineHeight: 1.2,
                mb: 0.3
              }}
            >
              {account && account.user ? account.user.display_name || 'Loading...' : 'Loading...'}
            </Typography>

            {account && account.user && userGroup && userGroup[account.user.group] && (
              <InfoChip
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Icon icon="solar:heart-bold" color={theme.palette.error.main} width={12} />
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                      {userGroup[account.user.group].name} | rpm:{userGroup[account.user.group].api_rate}
                    </Typography>
                  </Stack>
                }
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Box>
        </Stack>

        <Box sx={{ mt: 1 }}>
          <Stack direction="row" alignItems="center" mb={0.5}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5, mr: 'auto' }}
            >
              <Icon icon="solar:wallet-money-linear" width={12} />
              {t('sidebar.remainingBalance')}: ${balance}
            </Typography>
            <Tooltip title={t('dashboard_index.calls')}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <Icon icon="solar:call-linear" width={12} />
                {new Intl.NumberFormat().format(requestCount)}
              </Typography>
            </Tooltip>
          </Stack>

          <Box sx={{ position: 'relative' }}>
            <ProgressBarWrapper>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getProgressColor()
                  }
                }}
              />
            </ProgressBarWrapper>
            <Typography
              variant="caption"
              component="div"
              sx={{
                fontSize: '0.7rem',
                color: 'text.secondary',
                position: 'relative',
                textAlign: 'right',
                mt: 0.5
              }}
            >
              {`💲${usedQuota} (${Math.round(progressValue)}%)`}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconHeadset />}
          fullWidth
          sx={{
            mt: 2,
            //颜色适配暗色
            background: '#13151A',
            color: theme.palette.primary.contrastText,
            '&:hover': {
              backgroundColor: '#1C1E23',
              color: '#1CE3EA'
            }
          }}
          onClick={() => window.open('https://work.weixin.qq.com/kfid/kfce787ac8bbad50026', '_blank')}
        >
          微信客服
        </Button>
      </CardContent>
    </CardStyle>
  );
};

export default MenuCard;
