import {
  Typography,
  Stack,
  OutlinedInput,
  InputAdornment,
  Button,
  InputLabel,
  FormControl,
  useMediaQuery,
  TextField,
  Box,
  Grid,
  Divider,
  Badge
} from '@mui/material';
import { IconBuildingBank } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import SubCard from 'ui-component/cards/SubCard';
import UserCard from 'ui-component/cards/UserCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { useSelector } from 'react-redux';
import PayDialog from './PayDialog';

import { API } from 'utils/api';
import React, { useEffect, useState } from 'react';
import { showError, showInfo, showSuccess, renderQuota, trims } from 'utils/common';

const TopupCard = () => {
  const theme = useTheme();
  const [redemptionCode, setRedemptionCode] = useState('');
  const [userQuota, setUserQuota] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payment, setPayment] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [amount, setAmount] = useState(0);
  const [open, setOpen] = useState(false);
  const [disabledPay, setDisabledPay] = useState(false);
  const matchDownSM = useMediaQuery(theme.breakpoints.down('md'));
  const siteInfo = useSelector((state) => state.siteInfo);
  const RechargeDiscount = useSelector((state) => {
    if (state.siteInfo.RechargeDiscount === '') {
      return {};
    }
    return JSON.parse(state.siteInfo.RechargeDiscount);
  });
  const topUp = async () => {
    if (redemptionCode === '') {
      showInfo('请输入充值码！');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/api/user/topup', {
        key: trims(redemptionCode)
      });
      const { success, message, data, upgradedToVIP } = res.data;
      if (success) {
        if (upgradedToVIP) {  // 如果用户成功升级为 VIP
          showSuccess('充值成功，升级为 VIP 会员！');
        } else {
          showSuccess('充值成功，谢谢。');
        }
        setUserQuota((quota) => {
          return quota + data;
        });
        setRedemptionCode('');
      } else {
        showError(message);
      }
    } catch (err) {
      showError('失败,请右下角联系客服');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = () => {
    if (!selectedPayment) {
      showError('请选择支付方式');
      return;
    }

    if (amount <= 0 || amount < siteInfo.PaymentMinAmount) {
      showError('金额不能小于' + siteInfo.PaymentMinAmount);
      return;
    }

    if (amount > 1000000) {
      showError('金额不能大于1000000');
      return;
    }

    // 判读金额是否是正整数
    if (!/^[1-9]\d*$/.test(amount)) {
      showError('请输入正整数金额');
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

  const calculateFee = () => {
    if (!selectedPayment) return 0;

    if (selectedPayment.fixed_fee > 0) {
      return Number(selectedPayment.fixed_fee); //固定费率不计算折扣
    }
    const discount = RechargeDiscount[amount] || 1; // 如果没有折扣，则默认为1（即没有折扣）
    let newAmount = amount * discount; //折后价格
    return parseFloat(selectedPayment.percent_fee * Number(newAmount)).toFixed(2);
  };

  const calculateTotal = () => {
    if (amount === 0) return 0;
    const discount = RechargeDiscount[amount] || 1; // 如果没有折扣，则默认为1（即没有折扣）
    let newAmount = amount * discount; //折后价格
    let total = Number(newAmount) + Number(calculateFee());
    if (selectedPayment && selectedPayment.currency === 'CNY') {
      total = parseFloat((total * siteInfo.PaymentUSDRate).toFixed(2));
    }
    return total;
  };

  const handleDiscountTotal = (amount) => {
    if (amount === 0) return 0;
    // 如果金额在RechargeDiscount中，则应用折扣,手续费和货币换算汇率不算在折扣内
    const discount = RechargeDiscount[amount] || 1; // 如果没有折扣，则默认为1（即没有折扣）
    console.log(amount, discount);
  };

  //交易汇率计算
  const calculateExchangeRate = () => {
    if (selectedPayment && selectedPayment.currency === 'CNY') {
      const actualPayAmount = calculateTotal();

      // 如果amount或actualPayAmount无效，则返回0
      if (!amount || !actualPayAmount || isNaN(actualPayAmount / amount)) {
        return `￥0/ $`;
      }

      return `￥${(actualPayAmount / amount).toFixed(2)}/ $`;
    }
    return null;
  };



  useEffect(() => {
    getPayment().then();
    getUserQuota().then();
  }, []);

  return (
    <UserCard>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} paddingTop={'20px'}>
        <IconBuildingBank color={theme.palette.primary.main} />
        <Typography variant="h4">当前额度:</Typography>
        <Typography variant="h4">{renderQuota(userQuota)}</Typography>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} paddingTop={'20px'}>
        <Typography variant="h6">充值$5即可自动升级VIP，当前在线支付自动升级功能有误，请先联系客服人工调整会员等级。</Typography>
      </Stack>

      {payment.length > 0 && (
        <SubCard
          sx={{
            marginTop: '40px'
          }}
          title="在线充值"
        >
          <Stack spacing={2}>
            <Grid container spacing={2}>
              {payment.map((item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <AnimateButton>
                    <Button
                      disableElevation
                      fullWidth
                      size="large"
                      variant="outlined"
                      onClick={() => handlePaymentSelect(item)}
                      sx={{
                        ...theme.typography.LoginButton,
                        border: selectedPayment === item ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent'
                      }}
                    >
                      <Box sx={{ mr: { xs: 1, sm: 2, width: 20 }, display: 'flex', alignItems: 'center' }}>
                        <img src={item.icon} alt="payment" width={25} height={25} style={{ marginRight: matchDownSM ? 8 : 16 }} />
                      </Box>
                      {item.name}
                    </Button>
                  </AnimateButton>
                </Grid>
              ))}
            </Grid>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Grid container spacing={2}>
                  {Object.entries(RechargeDiscount).map(([key, value]) => (
                    <Grid item key={key}>
                      <Badge badgeContent={value !== 1 ? `${value * 10}折` : null} color="error">
                        <Button
                          variant="outlined"
                          onClick={() => handleSetAmount(key)}
                          sx={{
                            border: amount === Number(key) ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent'
                          }}
                        >
                          ${key}
                        </Button>
                      </Badge>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs="auto">
                <TextField
                  label="金额"
                  type="number"
                  onChange={handleAmountChange}
                  value={amount}
                  sx={{ minWidth: '150px', mr: 2 }} // 设定一个最小宽度，并添加右边距
                />
              </Grid>
            </Grid>
            <Divider />
            <Grid container direction="row" justifyContent="flex-end" spacing={2}>
              <Grid item xs={6} md={9}>
                <Typography variant="h6" style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                  充值金额:{' '}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                ${Number(amount)}
              </Grid>
              <Grid item xs={6} md={9}>
                <Typography variant="h6" style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                  交易汇率:{' '}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                {calculateExchangeRate()}
              </Grid>
              <Grid item xs={6} md={9}>
                <Typography variant="h6" style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                  支付金额:{' '}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                {calculateTotal()}{' '}
                {selectedPayment &&
                  (selectedPayment.currency === 'CNY' ? `CNY ` : selectedPayment.currency)}
              </Grid>
            </Grid>

            <Button variant="contained" onClick={handlePay} disabled={disabledPay}>
              充值
            </Button>
          </Stack>
          <PayDialog open={open} onClose={onClosePayDialog} amount={amount} uuid={selectedPayment.uuid} />
        </SubCard>
      )}

      {/* 在这里插入“邀请奖励”部分的代码 */}

      <SubCard
        sx={{
          marginTop: '40px'
        }}
        title="兑换码充值"
      >
        <FormControl fullWidth variant="outlined">
          <InputLabel htmlFor="key">兑换码</InputLabel>
          <OutlinedInput
            id="key"
            label="兑换码"
            type="text"
            value={redemptionCode}
            onChange={(e) => {
              setRedemptionCode(e.target.value);
            }}
            name="key"
            placeholder="请输入兑换码"
            endAdornment={
              <InputAdornment position="end">
                <Button variant="contained" onClick={topUp} disabled={isSubmitting}>
                  {isSubmitting ? '兑换中...' : '兑换'}
                </Button>
              </InputAdornment>
            }
            aria-describedby="helper-text-channel-quota-label"
          />
        </FormControl>

      </SubCard>
    </UserCard>
  );
};

export default TopupCard;