import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Grid from '@mui/material/Unstable_Grid2';
import { alpha, styled, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import PropTypes from 'prop-types';
import { QRCode } from 'react-qrcode-logo';
import { useSelector } from 'react-redux';
import successSvg from 'assets/images/success.svg';
import RedemptionCard from './component/RedemptionCard';
import TopupCard from './component/TopupCard';
import { useTranslation } from 'react-i18next';
import { API } from 'utils/api';
import { formatMoneyByCurrency, showError } from 'utils/common';

const PlanCard = styled(Card)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.12)' : '0 4px 14px rgba(44, 40, 37, 0.05)',
  transition: 'all 0.2s ease-in-out',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: theme.palette.mode === 'dark' ? '0 6px 18px rgba(0,0,0,0.2)' : '0 6px 20px rgba(44, 40, 37, 0.1)'
  }
}));

const PageShell = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 1240,
  margin: '0 auto',
  paddingBottom: theme.spacing(4)
}));

const durationLabel = (type, count) => {
  const labels = { day: '天', week: '周', month: '个月' };
  return `${count} ${labels[type] || type}`;
};

const SubscriptionPlans = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [purchasePlan, setPurchasePlan] = useState(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [planRes, payRes] = await Promise.all([API.get('/api/user/subscription_plan'), API.get('/api/user/payment')]);
        if (planRes.data.success) {
          setPlans(planRes.data.data || []);
        }
        if (payRes.data.success && payRes.data.data && payRes.data.data.length > 0) {
          const sorted = payRes.data.data.sort((a, b) => b.sort - a.sort);
          setPayments(sorted);
          setSelectedPayment(sorted[0]);
        }
      } catch (error) {
        // handled
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBuy = async (plan) => {
    if (!selectedPayment) {
      showError(t('subscription.selectPayment'));
      return;
    }
    setPurchasePlan(plan);
    setPayDialogOpen(true);
  };

  const parseFeatures = (features) => {
    if (!features) return [];
    if (Array.isArray(features)) return features;
    return features
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (plans.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">{t('subscription.noSubscriptions')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {payments.length > 1 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
            {t('subscription.selectPaymentMethod')}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
            {payments.map((item, index) => (
              <Button
                key={index}
                variant="outlined"
                size="small"
                onClick={() => setSelectedPayment(item)}
                sx={{
                  py: 0.8,
                  px: 2,
                  border: selectedPayment === item ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                  '&:hover': { borderColor: theme.palette.primary.main }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {item.icon && <img src={item.icon} alt={item.name} width={20} height={20} />}
                  <Typography variant="caption" fontWeight={500}>
                    {item.name}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      <Grid container spacing={2.5} justifyContent="center">
        {plans.map((plan) => {
          const features = parseFeatures(plan.features);
          return (
            <Grid xs={12} sm={6} md={4} key={plan.id}>
              <PlanCard>
                <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Typography variant="h5" fontWeight={700}>
                      {plan.name}
                    </Typography>
                    <Chip
                      label={durationLabel(plan.duration_type, plan.duration_count)}
                      size="small"
                      variant="outlined"
                      color="secondary"
                      sx={{ borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, height: 22 }}
                    />
                  </Stack>

                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 1.5, color: theme.palette.primary.main }}>
                    {formatMoneyByCurrency(plan.price, plan.price_currency || 'USD')}
                  </Typography>

                  {plan.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {plan.description}
                    </Typography>
                  )}

                  <Stack spacing={1} sx={{ mb: 2, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Icon icon="solar:wallet-money-linear" width={16} color={theme.palette.text.secondary} />
                      <Typography variant="body2" color="text.secondary">
                        {t('subscription.quotaAmount')}: {formatMoneyByCurrency(plan.quota_amount, 'USD')}
                      </Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Icon icon="solar:users-group-rounded-linear" width={16} color={theme.palette.text.secondary} />
                      <Typography variant="body2" color="text.secondary">
                        分组: {plan.group_symbol}
                      </Typography>
                    </Stack>

                    {features.map((feature, index) => (
                      <Stack direction="row" alignItems="center" spacing={1} key={index}>
                        <Icon icon="solar:check-circle-linear" width={16} color={theme.palette.success.main} />
                        <Typography variant="body2" color="text.secondary">
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleBuy(plan)}
                    startIcon={<Icon icon="solar:cart-large-2-linear" width={18} />}
                    sx={{ borderRadius: '6px' }}
                  >
                    {t('subscription.purchase')}
                  </Button>
                </CardContent>
              </PlanCard>
            </Grid>
          );
        })}
      </Grid>

      {purchasePlan && selectedPayment && (
        <SubscriptionPayDialog
          open={payDialogOpen}
          onClose={() => {
            setPayDialogOpen(false);
            setPurchasePlan(null);
          }}
          planId={purchasePlan.id}
          uuid={selectedPayment.uuid}
        />
      )}
    </Box>
  );
};

const SubscriptionPayDialog = ({ open, onClose, planId, uuid }) => {
  const theme = useTheme();
  const siteInfo = useSelector((state) => state.siteInfo);
  const defaultLogo = '/logo.svg';
  const [message, setMessage] = useState('正在创建支付...');
  const [subMessage, setSubMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [success, setSuccess] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  let useLogo = siteInfo.logo ? siteInfo.logo : defaultLogo;

  const clearValue = () => {
    setMessage('正在创建支付...');
    setSubMessage(null);
    setLoading(false);
    setQrCodeUrl(null);
    setSuccess(false);
  };

  const pollOrderStatus = useCallback((tradeNo) => {
    const id = setInterval(() => {
      API.get(`/api/user/order/status?trade_no=${tradeNo}`).then((response) => {
        if (response.data.success) {
          clearInterval(id);
          setMessage('支付成功');
          setLoading(false);
          setSuccess(true);
          setQrCodeUrl(null);
          setIntervalId(null);
        }
      });
    }, 3000);
    setIntervalId(id);
  }, []);

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

  useEffect(() => {
    if (!open) return;
    setMessage('正在创建支付...');
    setLoading(true);

    API.post('/api/user/subscription/purchase', {
      plan_id: planId,
      uuid: uuid
    }).then((response) => {
      if (!response.data.success) {
        showError(response.data.message);
        setLoading(false);
        onClose();
        return;
      }

      const { type, data } = response.data.data;
      if (type === 1) {
        setMessage('等待支付中...');
        setSubMessage(
          <>
            如果没有自动跳转，请点击
            <a href="#" onClick={() => openPayUrl(data.method, data.url, data.params)}>
              这里跳转
            </a>
          </>
        );
        openPayUrl(data.method, data.url, data.params);
      } else if (type === 2) {
        setQrCodeUrl(data.url);
        setLoading(false);
        setMessage('请扫码支付');
      }
      pollOrderStatus(response.data.data.trade_no);
    });
  }, [open, planId, uuid, onClose, pollOrderStatus]);

  const handleOpenAlipay = (alipayUrl) => {
    if (alipayUrl && alipayUrl.startsWith('https://qr.alipay.com')) {
      window.open(alipayUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} fullWidth maxWidth={'sm'} disableEscapeKeyDown>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem' }}>购买套餐</DialogTitle>
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
      <DialogContent>
        <Stack direction="column" justifyContent="center" alignItems="center" spacing={2} sx={{ py: 2 }}>
          {loading && <img src={useLogo} alt="loading" height="100" />}
          {qrCodeUrl && (
            <QRCode
              value={qrCodeUrl}
              size={256}
              qrStyle="dots"
              eyeRadius={20}
              fgColor={theme.palette.primary.main}
              bgColor={theme.palette.background.paper}
            />
          )}
          {success && <img src={successSvg} alt="success" height="100" />}
          <Typography variant="h3">{message}</Typography>
          {subMessage && <Typography variant="body1">{subMessage}</Typography>}
          {qrCodeUrl && qrCodeUrl.startsWith('https://qr.alipay.com') && !success && (
            <Button variant="contained" color="primary" onClick={() => handleOpenAlipay(qrCodeUrl)}>
              打开支付宝
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

SubscriptionPayDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  planId: PropTypes.number,
  uuid: PropTypes.string
};

// 主页面：Tab 切换
const Topup = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState('topup');
  const [hasPlans, setHasPlans] = useState(false);

  useEffect(() => {
    API.get('/api/user/subscription_plan')
      .then((res) => {
        if (res.data.success && res.data.data && res.data.data.length > 0) {
          setHasPlans(true);
        }
      })
      .catch(() => {
        // handled
      });
  }, []);

  const tabOptions = useMemo(() => {
    const options = [
      {
        value: 'topup',
        icon: 'solar:wallet-money-linear',
        label: t('topupPage.balanceTab'),
        description: t('topupPage.balanceModeDescription')
      },
      {
        value: 'redeem',
        icon: 'solar:ticket-sale-linear',
        label: t('topupPage.redemptionTab'),
        description: t('topupPage.redemptionModeDescription')
      }
    ];

    if (hasPlans) {
      options.push({
        value: 'plans',
        icon: 'solar:layers-minimalistic-linear',
        label: t('topupPage.planTab'),
        description: t('topupPage.planModeDescription')
      });
    }

    return options;
  }, [hasPlans, t]);

  const switcherSurface =
    theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.72) : alpha(theme.palette.common.white, 0.88);

  return (
    <PageShell>
      <Box
        role="tablist"
        aria-label={t('topupPage.modeSwitcher')}
        sx={{
          width: '100%',
          maxWidth: hasPlans ? 540 : 420,
          p: 0.5,
          mx: 'auto',
          mb: { xs: 2, md: 2.5 },
          borderRadius: '999px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: switcherSurface,
          backdropFilter: 'blur(12px)'
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${tabOptions.length}, minmax(0, 1fr))`,
            gap: 0.5
          }}
        >
          {tabOptions.map((option) => {
            const selected = tabValue === option.value;

            return (
              <ButtonBase
                key={option.value}
                role="tab"
                aria-selected={selected}
                onClick={() => setTabValue(option.value)}
                sx={{
                  width: '100%',
                  minHeight: 44,
                  px: { xs: 1.5, sm: 2 },
                  borderRadius: '999px',
                  color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
                  backgroundColor: selected
                    ? theme.palette.mode === 'dark'
                      ? alpha(theme.palette.primary.main, 0.16)
                      : alpha(theme.palette.primary.main, 0.1)
                    : 'transparent',
                  border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.26) : 'transparent'}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: selected
                      ? undefined
                      : theme.palette.mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.04)
                        : alpha(theme.palette.common.black, 0.03)
                  }
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <Icon icon={option.icon} width={18} />
                  <Typography variant="subtitle2" fontWeight={selected ? 700 : 600}>
                    {option.label}
                  </Typography>
                </Stack>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: tabValue === 'plans' ? 1180 : 760,
          mx: 'auto'
        }}
      >
        {tabValue === 'topup' && <TopupCard />}
        {tabValue === 'redeem' && <RedemptionCard />}
        {hasPlans && tabValue === 'plans' && <SubscriptionPlans />}
      </Box>
    </PageShell>
  );
};

export default Topup;
