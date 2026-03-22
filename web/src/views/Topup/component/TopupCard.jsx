import { Badge, Button, Box, Grid, Stack, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import SubCard from 'ui-component/cards/SubCard';
import { useSelector } from 'react-redux';
import PayDialog from './PayDialog';

import { API } from 'utils/api';
import React, { useEffect, useState, useMemo } from 'react';
import { showError, renderQuota } from 'utils/common';
import { useTranslation } from 'react-i18next';

const TopupCard = () => {
  const { t } = useTranslation(); // Translation hook
  const theme = useTheme();
  const [userQuota, setUserQuota] = useState(0);
  const [payment, setPayment] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [amount, setAmount] = useState(0);
  const [open, setOpen] = useState(false);
  const [disabledPay, setDisabledPay] = useState(false);
  const siteInfo = useSelector((state) => state.siteInfo);
  const RechargeDiscount = useMemo(() => {
    if (siteInfo.RechargeDiscount === '') {
      return {};
    }
    try {
      return JSON.parse(siteInfo.RechargeDiscount);
    } catch (e) {
      return {};
    }
  }, [siteInfo.RechargeDiscount]);

  const handlePay = () => {
    if (!selectedPayment) {
      showError(t('topupCard.selectPaymentMethod'));
      return;
    }

    if (amount <= 0 || amount < siteInfo.PaymentMinAmount) {
      showError(`${t('topupCard.amountMinLimit')} ${siteInfo.PaymentMinAmount}`);
      return;
    }

    if (amount > 1000000) {
      showError(t('topupCard.amountMaxLimit'));
      return;
    }

    // 判读金额是否是正整数
    if (!/^[1-9]\d*$/.test(amount)) {
      showError(t('topupCard.positiveIntegerAmount'));
      return;
    }

    setDisabledPay(true);
    setOpen(true);
  };

  const onClosePayDialog = () => {
    setOpen(false);
    setDisabledPay(false);
  };

  const getPayment = async () => {
    try {
      let res = await API.get(`/api/user/payment`);
      const { success, data } = res.data;
      if (success) {
        if (data.length > 0) {
          data.sort((a, b) => b.sort - a.sort);
          setPayment(data);
          setSelectedPayment(data[0]);
        }
      }
    } catch (error) {
      return;
    }
  };

  const getUserQuota = async () => {
    try {
      let res = await API.get(`/api/user/self`);
      const { success, message, data } = res.data;
      if (success) {
        setUserQuota(data.quota);
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  const handlePaymentSelect = (payment) => {
    setSelectedPayment(payment);
  };

  const handleAmountChange = (event) => {
    const value = event.target.value;
    if (value === '') {
      setAmount('');
      return;
    }
    handleSetAmount(value);
  };

  const handleSetAmount = (amount) => {
    amount = Number(amount);
    setAmount(amount);
    handleDiscountTotal(amount);
  };

  const getAppliedDiscount = (targetAmount) => {
    if (!targetAmount) return 1;

    let appliedDiscount = 1;
    Object.entries(RechargeDiscount).forEach(([threshold, discount]) => {
      if (targetAmount >= Number(threshold) && discount < appliedDiscount) {
        appliedDiscount = discount;
      }
    });

    return appliedDiscount;
  };

  const calculateFee = () => {
    if (!selectedPayment) return 0;

    if (selectedPayment.fixed_fee > 0) {
      return Number(selectedPayment.fixed_fee); //固定费率不计算折扣
    }
    const discount = getAppliedDiscount(amount);
    let newAmount = amount * discount; //折后价格
    return parseFloat(selectedPayment.percent_fee * Number(newAmount)).toFixed(2);
  };

  const calculateTotal = () => {
    if (amount === 0) return 0;

    const appliedDiscount = getAppliedDiscount(amount);
    let newAmount = amount * appliedDiscount; // 折后价格
    let total = Number(newAmount) + Number(calculateFee());
    if (selectedPayment && selectedPayment.currency === 'CNY') {
      total = parseFloat((total * siteInfo.PaymentUSDRate).toFixed(2));
    }
    return total;
  };

  const handleDiscountTotal = (amount) => {
    if (amount === 0) return 0;

    getAppliedDiscount(amount);
  };

  //交易汇率计算
  const calculateExchangeRate = () => {
    if (selectedPayment && selectedPayment.currency === 'CNY') {
      const actualPayAmount = calculateTotal();

      // 如果amount或actualPayAmount无效，则返回0
      if (!amount || !actualPayAmount || isNaN(actualPayAmount / amount)) {
        return `￥0/ $`;
      }

      const appliedDiscount = getAppliedDiscount(amount);
      const discountInfo = appliedDiscount !== 1 ? ` (${appliedDiscount * 100}%)` : '';
      return `￥${(actualPayAmount / amount).toFixed(2)}/ $${discountInfo}`;
    }
    return null;
  };

  const quickAmounts = Object.entries(RechargeDiscount).sort((a, b) => Number(a[0]) - Number(b[0]));
  const amountValue = Number(amount) || 0;
  const summaryItems = [
    {
      key: 'amount',
      label: t('topupCard.topupAmount'),
      value: `$${amountValue}`
    },
    {
      key: 'rate',
      label: t('topupCard.exchangeRate'),
      value: calculateExchangeRate() || '--'
    },
    {
      key: 'total',
      label: t('topupCard.actualAmountToPay'),
      value: `${calculateTotal()} ${selectedPayment ? (selectedPayment.currency === 'CNY' ? 'CNY' : selectedPayment.currency) : ''}`.trim()
    }
  ];

  const panelSx = {
    borderRadius: 3,
    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.28) : alpha(theme.palette.grey[50], 0.7),
    p: { xs: 1.5, sm: 2 }
  };

  useEffect(() => {
    getPayment().then();
    getUserQuota().then();
  }, []);

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          ...panelSx,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 1.5, sm: 2 },
          py: { xs: 1.25, sm: 1.5 },
          flexDirection: { xs: 'column', sm: 'row' }
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1)
            }}
          >
            <Icon icon="solar:wallet-money-linear" width={20} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('topupCard.currentQuota')}
            </Typography>
            <Typography variant="h4">{renderQuota(userQuota)}</Typography>
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
          充值达$5会自动升级Pro, 模型更好更快.
        </Typography>
      </Box>

      {payment.length > 0 && (
        <SubCard
          sx={{
            borderRadius: 3
          }}
          contentSX={{ p: { xs: 2, sm: 2.5 } }}
          title={t('topupCard.onlineTopup')}
        >
          <Stack spacing={2.5}>
            <Box sx={panelSx}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>
                {t('topupCard.selectPaymentMethod')}
              </Typography>
              <Grid container spacing={1.5} justifyContent="center">
                {payment.map((item, index) => (
                  <Grid item xs={12} sm={payment.length > 1 ? 6 : 12} key={index}>
                    <Button
                      disableElevation
                      fullWidth
                      size="large"
                      variant="outlined"
                      onClick={() => handlePaymentSelect(item)}
                      sx={{
                        minHeight: 54,
                        borderRadius: 2.5,
                        justifyContent: 'flex-start',
                        px: 2,
                        gap: 1.5,
                        color: theme.palette.text.primary,
                        backgroundColor:
                          selectedPayment === item
                            ? theme.palette.mode === 'dark'
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(theme.palette.primary.main, 0.06)
                            : theme.palette.background.paper,
                        borderColor: selectedPayment === item ? theme.palette.primary.main : theme.palette.divider
                      }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.05)
                              : alpha(theme.palette.common.black, 0.03),
                          flexShrink: 0
                        }}
                      >
                        {item.icon && <img src={item.icon} alt="payment" width={22} height={22} />}
                      </Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {item.name}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box sx={panelSx}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {t('topupCard.amount')}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {quickAmounts.map(([key, value]) => (
                      <Badge key={key} badgeContent={value !== 1 ? `${value * 100}%` : null} color="error">
                        <Button
                          variant="outlined"
                          onClick={() => handleSetAmount(key)}
                          sx={{
                            minWidth: 84,
                            borderRadius: '999px',
                            borderColor: amount === Number(key) ? theme.palette.primary.main : theme.palette.divider,
                            backgroundColor:
                              amount === Number(key)
                                ? theme.palette.mode === 'dark'
                                  ? alpha(theme.palette.primary.main, 0.12)
                                  : alpha(theme.palette.primary.main, 0.06)
                                : 'transparent'
                          }}
                        >
                          ${key}
                        </Button>
                      </Badge>
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12} md="auto">
                  <TextField
                    label={t('topupCard.amount')}
                    type="number"
                    onChange={handleAmountChange}
                    value={amount}
                    sx={{ minWidth: { xs: '100%', md: 170 } }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={panelSx}>
              <Grid container spacing={1.5}>
                {summaryItems.map((item) => (
                  <Grid item xs={12} sm={4} key={item.key}>
                    <Box
                      sx={{
                        height: '100%',
                        borderRadius: 2.5,
                        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                        backgroundColor: theme.palette.background.paper,
                        px: 1.5,
                        py: 1.25
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5, wordBreak: 'break-word' }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Button variant="contained" size="large" onClick={handlePay} disabled={disabledPay} sx={{ minHeight: 46, borderRadius: 2.5 }}>
              {t('topupCard.topup')}
            </Button>
          </Stack>
          <PayDialog open={open} onClose={onClosePayDialog} amount={amount} uuid={selectedPayment.uuid} />
        </SubCard>
      )}
    </Stack>
  );
};

export default TopupCard;
