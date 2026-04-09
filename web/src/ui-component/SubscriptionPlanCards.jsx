import { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, ButtonBase, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { alpha, styled, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { formatMoneyByCurrency } from 'utils/common';

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

const BILLING_CYCLES = [
  { value: 'monthly', label: '月付' },
  { value: 'quarterly', label: '季付' },
  { value: 'yearly', label: '年付' }
];

const BillingCycleSwitcher = ({ plan, selectedCycle, onCycleChange }) => {
  const theme = useTheme();
  const availableCycles = BILLING_CYCLES.filter((cycle) => {
    if (cycle.value === 'monthly') return true;
    if (cycle.value === 'quarterly') return plan.enable_quarterly;
    if (cycle.value === 'yearly') return plan.enable_yearly;
    return false;
  });

  if (availableCycles.length <= 1) return null;

  return (
    <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }}>
      {availableCycles.map((cycle) => {
        const selected = selectedCycle === cycle.value;
        return (
          <ButtonBase
            key={cycle.value}
            onClick={() => onCycleChange(cycle.value)}
            sx={{
              flex: 1,
              py: 0.5,
              px: 1,
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: selected ? 700 : 500,
              color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
              backgroundColor: selected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.3) : theme.palette.divider}`,
              transition: 'all 0.15s ease'
            }}
          >
            {cycle.label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
};

BillingCycleSwitcher.propTypes = {
  plan: PropTypes.object.isRequired,
  selectedCycle: PropTypes.string.isRequired,
  onCycleChange: PropTypes.func.isRequired
};

const getPlanPriceForCycle = (plan, cycle) => {
  switch (cycle) {
    case 'quarterly':
      return plan.quarterly_price || plan.monthly_price * 3;
    case 'yearly':
      return plan.yearly_price || plan.monthly_price * 12;
    default:
      return plan.monthly_price || plan.price;
  }
};

const getCycleDurationLabel = (cycle) => {
  switch (cycle) {
    case 'quarterly':
      return '/ 季';
    case 'yearly':
      return '/ 年';
    default:
      return '/ 月';
  }
};

const durationLabel = (type, count) => {
  const labels = { day: '天', week: '周', month: '个月' };
  return `${count} ${labels[type] || type}`;
};

const parseFeatures = (features) => {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  return features
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f);
};

/**
 * 套餐卡片展示组件（纯展示 + 周期切换）
 *
 * @param {Object[]} plans - 套餐列表（来自 /api/user/subscription_plan）
 * @param {boolean} loading - 加载状态
 * @param {Function} onBuy - 点击购买回调 (plan, billingCycle) => void
 * @param {string} buyButtonLabel - 购买按钮文案（可选覆盖）
 * @param {string} buyButtonIcon - 购买按钮图标（可选覆盖）
 */
const SubscriptionPlanCards = ({ plans, loading, onBuy, buyButtonLabel, buyButtonIcon }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [planCycles, setPlanCycles] = useState({});

  const handleCycleChange = (planId, cycle) => {
    setPlanCycles((prev) => ({ ...prev, [planId]: cycle }));
  };

  const getSelectedCycle = (planId) => planCycles[planId] || 'monthly';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">{t('subscription.noSubscriptions')}</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5} justifyContent="center">
      {plans.map((plan) => {
        const features = parseFeatures(plan.features);
        const selectedCycle = getSelectedCycle(plan.id);
        const displayPrice = getPlanPriceForCycle(plan, selectedCycle);
        const hasMultipleCycles = plan.enable_quarterly || plan.enable_yearly;
        const monthlyEquiv = selectedCycle === 'quarterly' ? displayPrice / 3 : selectedCycle === 'yearly' ? displayPrice / 12 : null;
        const billingHint =
          selectedCycle === 'monthly' ? '按月计费' : `折合 ${formatMoneyByCurrency(monthlyEquiv, plan.price_currency || 'USD')}/月`;

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

                {hasMultipleCycles && (
                  <BillingCycleSwitcher
                    plan={plan}
                    selectedCycle={selectedCycle}
                    onCycleChange={(cycle) => handleCycleChange(plan.id, cycle)}
                  />
                )}

                <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mb: 0.5 }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                    {formatMoneyByCurrency(displayPrice, plan.price_currency || 'USD')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getCycleDurationLabel(selectedCycle)}
                  </Typography>
                  {selectedCycle === 'quarterly' && plan.quarterly_discount > 0 && (
                    <Chip
                      label={t('subscription.savePercent', { percent: plan.quarterly_discount })}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, height: 20, ml: 0.5 }}
                    />
                  )}
                  {selectedCycle === 'yearly' && plan.yearly_discount > 0 && (
                    <Chip
                      label={t('subscription.savePercent', { percent: plan.yearly_discount })}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, height: 20, ml: 0.5 }}
                    />
                  )}
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
                  {billingHint}
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
                      {t('subscription.quotaAmount')}: {formatMoneyByCurrency(plan.quota_amount, 'USD')}/月
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
                  onClick={() => onBuy(plan, selectedCycle)}
                  startIcon={<Icon icon={buyButtonIcon || 'solar:cart-large-2-linear'} width={18} />}
                  sx={{ borderRadius: '6px' }}
                >
                  {buyButtonLabel || t('subscription.purchase')}
                </Button>
              </CardContent>
            </PlanCard>
          </Grid>
        );
      })}
    </Grid>
  );
};

SubscriptionPlanCards.propTypes = {
  plans: PropTypes.array,
  loading: PropTypes.bool,
  onBuy: PropTypes.func.isRequired,
  buyButtonLabel: PropTypes.string,
  buyButtonIcon: PropTypes.string
};

export default SubscriptionPlanCards;
