import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  LinearProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme, alpha, styled } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { API } from 'utils/api';
import { showError } from 'utils/common';
import { QRCode } from 'react-qrcode-logo';
import { useSelector } from 'react-redux';

const ProgressBarWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: 8,
  borderRadius: 8,
  overflow: 'hidden',
  backgroundColor: alpha(theme.palette.divider, 0.5),
  '& .MuiLinearProgress-root': {
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'transparent',
    '& .MuiLinearProgress-bar': {
      borderRadius: 8
    }
  }
}));

const SubscriptionCard = styled(Card)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 14px rgba(44, 40, 37, 0.06)',
  transition: 'box-shadow 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,0.25)' : '0 6px 20px rgba(44, 40, 37, 0.1)'
  }
}));

const StatusChip = ({ status, t }) => {
  const chipConfig = {
    active: { label: t('subscription.statusActive'), color: 'success' },
    expired: { label: t('subscription.statusExpired'), color: 'default' },
    revoked: { label: t('subscription.statusRevoked'), color: 'error' }
  };

  const config = chipConfig[status] || chipConfig.expired;
  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
      sx={{ borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
};

StatusChip.propTypes = {
  status: PropTypes.string,
  t: PropTypes.func.isRequired
};

const RenewPayDialog = ({ open, onClose, subscriptionId, planId }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const siteInfo = useSelector((state) => state.siteInfo);
  const defaultLogo = '/logo.svg';
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [success, setSuccess] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  let useLogo = siteInfo.logo ? siteInfo.logo : defaultLogo;

  const clearValue = () => {
    setMessage('');
    setPayLoading(false);
    setQrCodeUrl(null);
    setSuccess(false);
    setSelectedPayment(null);
  };

  useEffect(() => {
    if (!open) return;
    clearValue();
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await API.get('/api/user/payment');
        const { success, data } = res.data;
        if (success && data && data.length > 0) {
          data.sort((a, b) => b.sort - a.sort);
          setPayments(data);
        }
      } catch (error) {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [open]);

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const pollOrderStatus = useCallback(
    (tradeNo) => {
      const id = setInterval(() => {
        API.get(`/api/user/order/status?trade_no=${tradeNo}`).then((response) => {
          if (response.data.success) {
            clearInterval(id);
            setMessage(t('subscription.paymentSuccess'));
            setPayLoading(false);
            setSuccess(true);
            setQrCodeUrl(null);
            setIntervalId(null);
          }
        });
      }, 3000);
      setIntervalId(id);
    },
    [t]
  );

  function openPayUrl(method, url, params) {
    const form = document.createElement('form');
    form.method = method;
    form.action = url;
    form.target = '_blank';
    for (const key in params) {
      const input = document.createElement('input');
      input.name = key;
      input.value = params[key];
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  const handleRenew = async () => {
    if (!selectedPayment) {
      showError(t('subscription.selectPayment'));
      return;
    }
    setPayLoading(true);
    setMessage(t('subscription.initiatingPayment'));
    try {
      const res = await API.post('/api/user/subscription/renew', {
        subscription_id: subscriptionId,
        plan_id: planId,
        uuid: selectedPayment.uuid
      });
      if (!res.data.success) {
        showError(res.data.message);
        setPayLoading(false);
        return;
      }
      const { type, data } = res.data.data;
      if (type === 1) {
        setMessage(t('subscription.waitingPayment'));
        openPayUrl(data.method, data.url, data.params);
      } else if (type === 2) {
        setQrCodeUrl(data.url);
        setPayLoading(false);
        setMessage(t('subscription.scanToPay'));
      }
      pollOrderStatus(res.data.data.trade_no);
    } catch (error) {
      setPayLoading(false);
    }
  };

  return (
    <Dialog open={open} fullWidth maxWidth="sm" disableEscapeKeyDown>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{t('subscription.renewSubscription')}</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={() => {
          if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
          }
          clearValue();
          onClose();
        }}
        sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ pb: 3 }}>
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
          </Stack>
        ) : qrCodeUrl ? (
          <Stack direction="column" justifyContent="center" alignItems="center" spacing={2}>
            <QRCode
              value={qrCodeUrl}
              size={256}
              qrStyle="dots"
              eyeRadius={20}
              fgColor={theme.palette.primary.main}
              bgColor={theme.palette.background.paper}
            />
            {success ? (
              <Typography variant="h4" color="success.main">
                {message}
              </Typography>
            ) : (
              <Typography variant="h4">{message}</Typography>
            )}
          </Stack>
        ) : payLoading ? (
          <Stack direction="column" justifyContent="center" alignItems="center" spacing={2} py={4}>
            <img src={useLogo} alt="loading" height="80" />
            <Typography variant="h4">{message}</Typography>
          </Stack>
        ) : success ? (
          <Stack direction="column" justifyContent="center" alignItems="center" spacing={2} py={4}>
            <Icon icon="solar:check-circle-bold" width={80} color={theme.palette.success.main} />
            <Typography variant="h4" color="success.main">
              {message}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('subscription.selectPaymentMethod')}
            </Typography>
            <Grid container spacing={1.5}>
              {payments.map((item, index) => (
                <Grid xs={12} sm={6} key={index}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setSelectedPayment(item)}
                    sx={{
                      justifyContent: 'flex-start',
                      py: 1.5,
                      border: selectedPayment === item ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                      '&:hover': {
                        borderColor: theme.palette.primary.main
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <img src={item.icon} alt={item.name} width={24} height={24} />
                      <Typography variant="body2" fontWeight={500}>
                        {item.name}
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              ))}
            </Grid>
            <Button variant="contained" fullWidth onClick={handleRenew} disabled={!selectedPayment} sx={{ mt: 2.5 }}>
              {t('subscription.confirmRenew')}
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

RenewPayDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  subscriptionId: PropTypes.number,
  planId: PropTypes.number
};

const MySubscription = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState(null);
  const [renewSubscriptionId, setRenewSubscriptionId] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/user/subscription');
      const { success, data } = res.data;
      if (success) {
        setSubscriptions(data || []);
      }
    } catch (error) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const getDaysRemaining = (expireTime) => {
    const now = Date.now();
    const expire = expireTime * 1000;
    const diff = expire - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getUsagePercent = (used, total) => {
    if (!total || total === 0) return 0;
    return Math.min((used / total) * 100, 100);
  };

  const getProgressColor = (percent) => {
    if (percent < 60) return theme.palette.success.main;
    if (percent < 85) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const formatQuota = (quota) => {
    return Number(quota || 0).toFixed(2);
  };

  const handleRenew = (subscriptionId, planId) => {
    setRenewSubscriptionId(subscriptionId);
    setRenewPlanId(planId);
    setRenewDialogOpen(true);
  };

  const handleRenewDialogClose = () => {
    setRenewDialogOpen(false);
    setRenewSubscriptionId(null);
    setRenewPlanId(null);
    fetchSubscriptions();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: 2 }}>
        <Icon icon="solar:document-text-linear" width={64} color={theme.palette.text.secondary} />
        <Typography variant="h5" color="text.secondary">
          {t('subscription.noSubscriptions')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('subscription.noSubscriptionsHint')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('subscription.mySubscriptions')}
      </Typography>
      <Grid container spacing={2.5}>
        {subscriptions.map((sub) => {
          const daysLeft = getDaysRemaining(sub.expire_time);
          const usagePercent = getUsagePercent(sub.used_amount, sub.quota_amount);
          const isActive = sub.status === 'active';

          return (
            <Grid xs={12} sm={6} md={4} key={sub.id}>
              <SubscriptionCard>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                        {sub.plan_name}
                      </Typography>
                      {sub.group_symbol && (
                        <Chip
                          label={sub.group_symbol}
                          size="small"
                          variant="outlined"
                          color="secondary"
                          sx={{ borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, height: 20 }}
                        />
                      )}
                    </Box>
                    <StatusChip status={sub.status} t={t} />
                  </Stack>

                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Icon icon="solar:chart-2-linear" width={14} />
                        {t('subscription.usage')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {Math.round(usagePercent)}%
                      </Typography>
                    </Stack>
                    <ProgressBarWrapper>
                      <LinearProgress
                        variant="determinate"
                        value={usagePercent}
                        sx={{
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getProgressColor(usagePercent)
                          }
                        }}
                      />
                    </ProgressBarWrapper>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      ${formatQuota(sub.used_amount)} / ${formatQuota(sub.quota_amount)}
                    </Typography>
                  </Box>

                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Icon icon="solar:calendar-linear" width={14} color={theme.palette.text.secondary} />
                      <Typography variant="caption" color="text.secondary">
                        {isActive
                          ? daysLeft > 0
                            ? t('subscription.daysLeft', { days: daysLeft })
                            : t('subscription.statusExpired')
                          : t('subscription.statusExpired')}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack spacing={0.5} sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('subscription.startDate')}: {new Date(sub.start_time * 1000).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('subscription.expireDate')}: {new Date(sub.expire_time * 1000).toLocaleDateString()}
                    </Typography>
                  </Stack>

                  {isActive && (
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => handleRenew(sub.id, sub.plan_id)}
                      startIcon={<Icon icon="solar:refresh-circle-linear" width={18} />}
                      sx={{ borderRadius: '6px' }}
                    >
                      {t('subscription.renew')}
                    </Button>
                  )}
                </CardContent>
              </SubscriptionCard>
            </Grid>
          );
        })}
      </Grid>

      <RenewPayDialog open={renewDialogOpen} onClose={handleRenewDialogClose} subscriptionId={renewSubscriptionId} planId={renewPlanId} />
    </Box>
  );
};

export default MySubscription;
