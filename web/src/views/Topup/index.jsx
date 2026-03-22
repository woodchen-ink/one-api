import React, { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { useTheme, alpha, styled } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import TopupCard from './component/TopupCard';
import PayDialog from './component/PayDialog';
import { useTranslation } from 'react-i18next';
import { API } from 'utils/api';
import { showError } from 'utils/common';

const PlanCard = styled(Card)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
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

const SubscriptionPlans = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  const quotaPerUnit = localStorage.getItem('quota_per_unit') || 500000;

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/user/subscription_plan');
      const { success, data } = res.data;
      if (success) {
        setPlans(data || []);
      }
    } catch (error) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await API.get('/api/user/payment');
      const { success, data } = res.data;
      if (success && data && data.length > 0) {
        data.sort((a, b) => b.sort - a.sort);
        setPayments(data);
        setSelectedPayment(data[0]);
      }
    } catch (error) {
      // handled by interceptor
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchPayments();
  }, []);

  const handleBuy = (plan) => {
    if (!selectedPayment) {
      showError(t('subscription.selectPayment'));
      return;
    }
    setSelectedPlan(plan);
    setPayDialogOpen(true);
  };

  const handleSelectPayment = (payment) => {
    setSelectedPayment(payment);
  };

  const handlePayDialogClose = () => {
    setPayDialogOpen(false);
    setSelectedPlan(null);
  };

  const formatQuota = (quota) => {
    return (quota / quotaPerUnit).toFixed(2);
  };

  const formatDuration = (days) => {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      return t('subscription.durationYears', { years });
    }
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return t('subscription.durationMonths', { months });
    }
    return t('subscription.durationDays', { days });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Icon icon="solar:ticket-sale-linear" width={24} color={theme.palette.primary.main} />
        <Typography variant="h4">{t('subscription.subscriptionPlans')}</Typography>
      </Stack>

      {payments.length > 1 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('subscription.selectPaymentMethod')}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {payments.map((item, index) => (
              <Button
                key={index}
                variant="outlined"
                size="small"
                onClick={() => handleSelectPayment(item)}
                sx={{
                  py: 0.8,
                  px: 2,
                  border: selectedPayment === item ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                  '&:hover': { borderColor: theme.palette.primary.main }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <img src={item.icon} alt={item.name} width={20} height={20} />
                  <Typography variant="caption" fontWeight={500}>
                    {item.name}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      <Grid container spacing={2.5}>
        {plans.map((plan) => (
          <Grid xs={12} sm={6} md={4} key={plan.id}>
            <PlanCard>
              <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {plan.name}
                  </Typography>
                  {plan.duration && (
                    <Chip
                      label={formatDuration(plan.duration)}
                      size="small"
                      variant="outlined"
                      color="secondary"
                      sx={{ borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, height: 22 }}
                    />
                  )}
                </Stack>

                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    mb: 1.5,
                    color: theme.palette.primary.main
                  }}
                >
                  ${plan.price}
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
                      {t('subscription.quotaAmount')}: ${formatQuota(plan.quota_amount)}
                    </Typography>
                  </Stack>

                  {plan.features &&
                    (Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
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
        ))}
      </Grid>

      {selectedPlan && selectedPayment && (
        <PayDialog
          open={payDialogOpen}
          onClose={handlePayDialogClose}
          amount={selectedPlan.price}
          uuid={selectedPayment.uuid}
        />
      )}
    </Box>
  );
};

const Topup = () => {
  const { t } = useTranslation();

  return (
    <Grid container spacing={2} justifyContent="center">
      <Grid xs={12} md={6} lg={6}>
        <Stack spacing={2}>
          <TopupCard />
        </Stack>
      </Grid>
      <Grid xs={12}>
        <SubscriptionPlans />
      </Grid>
    </Grid>
  );
};

export default Topup;
