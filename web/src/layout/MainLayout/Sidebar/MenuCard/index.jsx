import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

// material-ui
import { styled, useTheme, alpha } from '@mui/material/styles';
import { Avatar, Card, CardContent, Box, Typography, Chip, LinearProgress, Stack, Button, Divider } from '@mui/material';
import User1 from 'assets/images/users/user-round.svg';
import { useNavigate } from 'react-router-dom';
import { IconHeadset } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { API } from 'utils/api';

const CardStyle = styled(Card)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.9) : alpha(theme.palette.background.paper, 0.94),
  backdropFilter: 'blur(8px)',
  border: `1px solid ${theme.palette.divider}`,
  marginBottom: '22px',
  overflow: 'hidden',
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.palette.mode === 'dark' ? '0 8px 18px rgba(0,0,0,0.18)' : '0 8px 20px rgba(44, 40, 37, 0.06)',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: '120px',
    height: '120px',
    background: alpha(theme.palette.secondary.main, 0.08),
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
  backgroundColor: alpha(theme.palette.divider, 0.6),
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
  const { user, userGroup } = useSelector((state) => state.account);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [balance, setBalance] = useState(0);
  const [usedQuota, setUsedQuota] = useState(0);
  const [subscriptions, setSubscriptions] = useState([]);

  const quotaPerUnit = localStorage.getItem('quota_per_unit') || 500000;

  const balanceValue = parseFloat(balance) || 0;
  const usedQuotaValue = parseFloat(usedQuota) || 0;
  const totalQuota = balanceValue + usedQuotaValue;
  const progressValue = totalQuota > 0 ? (usedQuotaValue / totalQuota) * 100 : 0;

  useEffect(() => {
    if (user) {
      setBalance(((user.quota || 0) / quotaPerUnit).toFixed(2));
      setUsedQuota(((user.used_quota || 0) / quotaPerUnit).toFixed(2));
    }
  }, [user, quotaPerUnit]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const res = await API.get('/api/user/subscription');
        const { success, data } = res.data;
        if (success && data) {
          const active = data.filter((s) => s.status === 'active');
          setSubscriptions(active);
        }
      } catch (error) {
        // silently fail - sidebar should not block on this
      }
    };
    fetchSubscriptions();
  }, []);

  const getProgressColor = () => {
    if (progressValue < 60) return theme.palette.success.main;
    if (progressValue < 85) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <CardStyle>
      <CardContent sx={{ p: 1.5, pb: '8px !important' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <Box
            component="div"
            sx={{
              cursor: 'pointer',
              position: 'relative',
              width: '38px',
              height: '38px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '50%',
              background: theme.palette.primary.gradient
            }}
            onClick={() => navigate('/panel/profile')}
          >
            <Avatar
              src={user?.avatar_url || User1}
              sx={{
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: (theme) => (theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff'),
                bgcolor: '#FFFFFF',
                variant: 'rounded',
                transition: 'transform 0.2s ease-in-out, background-color 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.03)'
                }
              }}
            />
          </Box>

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
              {user ? user.display_name || 'Loading...' : 'Loading...'}
            </Typography>

            {user && userGroup && userGroup[user.group] && (
              <InfoChip
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {/*<Icon icon="solar:heart-bold" color={theme.palette.error.main} width={12} />*/}
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                      {userGroup[user.group].name} | RPM:{userGroup[user.group].api_rate}
                    </Typography>
                  </Stack>
                }
                size="small"
                variant="outlined"
                color="secondary"
              />
            )}
          </Box>
        </Stack>

        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              mb: 1,
              p: 1.25,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.14)}`,
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(theme.palette.background.paper, 0.08)} 100%)`
                  : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.16)} 100%)`
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.35 }}
            >
              <Icon icon="solar:wallet-money-linear" width={13} />
              {t('sidebar.remainingBalance')}
            </Typography>
            <Typography
              sx={{
                fontSize: '1.35rem',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: theme.palette.text.primary
              }}
            >
              ${balance}
            </Typography>
          </Box>

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
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
              <Typography
                variant="caption"
                component="div"
                sx={{
                  fontSize: '0.7rem',
                  color: 'text.secondary'
                }}
              >
                {`${t('token_index.usedQuota')}: $${usedQuota}`}
              </Typography>
              <Typography
                variant="caption"
                component="div"
                sx={{
                  fontSize: '0.7rem',
                  color: 'text.secondary'
                }}
              >
                {`${Math.round(progressValue)}%`}
              </Typography>
            </Stack>
          </Box>
        </Box>

        {subscriptions.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75, fontWeight: 600 }}
            >
              <Icon icon="solar:ticket-sale-linear" width={12} />
              {t('subscription.activeSubscriptions')}
            </Typography>
            <Stack spacing={0.75}>
              {subscriptions.map((sub) => {
                const usedVal = (sub.used_amount / quotaPerUnit).toFixed(2);
                const totalVal = (sub.quota_amount / quotaPerUnit).toFixed(2);
                const subPercent = sub.quota_amount > 0 ? Math.min((sub.used_amount / sub.quota_amount) * 100, 100) : 0;
                const now = Date.now();
                const daysLeft = Math.max(0, Math.ceil((sub.expire_time * 1000 - now) / (1000 * 60 * 60 * 24)));
                const subProgressColor =
                  subPercent < 60 ? theme.palette.success.main : subPercent < 85 ? theme.palette.warning.main : theme.palette.error.main;

                return (
                  <Box
                    key={sub.id}
                    sx={{
                      p: 0.75,
                      borderRadius: 1,
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      backgroundColor: alpha(theme.palette.background.default, 0.4)
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
                      <InfoChip label={sub.group_symbol || sub.plan_name} size="small" variant="outlined" color="primary" />
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                        {daysLeft > 0 ? t('subscription.daysLeft', { days: daysLeft }) : t('subscription.statusExpired')}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
                      ${usedVal} / ${totalVal}
                    </Typography>
                    <ProgressBarWrapper sx={{ height: 3 }}>
                      <LinearProgress
                        variant="determinate"
                        value={subPercent}
                        sx={{
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: subProgressColor
                          }
                        }}
                      />
                    </ProgressBarWrapper>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        <Button
          variant="contained"
          startIcon={<IconHeadset />}
          fullWidth
          sx={{
            mt: 2,
            //颜色适配暗色
            background: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.secondary.dark,
              color: theme.palette.secondary.contrastText
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
