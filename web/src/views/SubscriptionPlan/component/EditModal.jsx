import PropTypes from 'prop-types';
import * as Yup from 'yup';
import { Formik } from 'formik';
import { useTheme } from '@mui/material/styles';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  FormControl,
  InputLabel,
  OutlinedInput,
  Switch,
  FormControlLabel,
  FormHelperText,
  Select,
  MenuItem
} from '@mui/material';

import { showSuccess, showError, trims } from 'utils/common';
import { API } from 'utils/api';

const PLAN_CURRENCY_OPTIONS = [
  { value: 'USD', label: '美元' },
  { value: 'CNY', label: '人民币' }
];

const validationSchema = Yup.object().shape({
  is_edit: Yup.boolean(),
  name: Yup.string().required('套餐名称不能为空'),
  group_symbol: Yup.string().required('绑定分组不能为空'),
  price: Yup.number().required('价格不能为空').min(0, '价格不能为负数'),
  price_currency: Yup.string().oneOf(['USD', 'CNY']).required('请选择售价币种'),
  quota_amount: Yup.number().required('配额不能为空').min(0, '配额不能为负数'),
  duration_type: Yup.string().oneOf(['day', 'week', 'month']).required(),
  duration_count: Yup.number().min(1, '数量至少为1').required()
});

const originInputs = {
  is_edit: false,
  name: '',
  group_symbol: '',
  description: '',
  features: '',
  price: 0,
  price_currency: 'USD',
  quota_amount: 0,
  duration_type: 'month',
  duration_count: 1,
  sort: 0,
  payment_product: '',
  enable: true,
  allow_renewal: true
};

const EditModal = ({ open, planId, onCancel, onOk }) => {
  const theme = useTheme();
  const [inputs, setInputs] = useState(originInputs);

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);

    let res;
    values = trims(values);
    try {
      const submitValues = {
        ...values,
        price: parseFloat(values.price),
        quota_amount: parseFloat(values.quota_amount),
        duration_count: parseInt(values.duration_count, 10),
        sort: parseInt(values.sort, 10)
        // features 保持 string 类型，直接提交
      };

      if (values.is_edit) {
        res = await API.put(`/api/subscription_plan/`, { ...submitValues, id: parseInt(planId) });
      } else {
        res = await API.post(`/api/subscription_plan/`, submitValues);
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess('保存成功');
        setSubmitting(false);
        setStatus({ success: true });
        onOk(true);
      } else {
        showError(message);
        setErrors({ submit: message });
      }
    } catch (error) {
      return;
    }
  };

  const loadPlan = async () => {
    try {
      let res = await API.get(`/api/subscription_plan/${planId}`);
      const { success, message, data } = res.data;
      if (success) {
        setInputs({
          ...originInputs,
          ...data,
          is_edit: true,
          price_currency: data.price_currency || 'USD'
        });
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  useEffect(() => {
    if (planId) {
      loadPlan().then();
    } else {
      setInputs(originInputs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth={'md'}>
      <DialogTitle sx={{ margin: '0px', fontWeight: 700, lineHeight: '1.55556', padding: '24px', fontSize: '1.125rem' }}>
        {planId ? '编辑套餐' : '新建套餐'}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={inputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, setFieldValue, handleSubmit, touched, values, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.name && errors.name)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-name-label">套餐名称</InputLabel>
                <OutlinedInput
                  id="plan-name-label"
                  label="套餐名称"
                  type="text"
                  value={values.name}
                  name="name"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.name && errors.name && <FormHelperText error>{errors.name}</FormHelperText>}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.group_symbol && errors.group_symbol)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-group-symbol-label">绑定分组</InputLabel>
                <OutlinedInput
                  id="plan-group-symbol-label"
                  label="绑定分组"
                  type="text"
                  value={values.group_symbol}
                  name="group_symbol"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.group_symbol && errors.group_symbol ? (
                  <FormHelperText error>{errors.group_symbol}</FormHelperText>
                ) : (
                  <FormHelperText>用户分组的标识（symbol）</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-description-label">描述</InputLabel>
                <OutlinedInput
                  id="plan-description-label"
                  label="描述"
                  type="text"
                  value={values.description}
                  name="description"
                  multiline
                  rows={2}
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                <FormHelperText>可选，套餐描述信息</FormHelperText>
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-features-label">特性描述</InputLabel>
                <OutlinedInput
                  id="plan-features-label"
                  label="特性描述"
                  type="text"
                  value={values.features}
                  name="features"
                  multiline
                  rows={3}
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                <FormHelperText>可选，每行一个特性描述，用于前端展示</FormHelperText>
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.price && errors.price)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-price-label">套餐售价</InputLabel>
                <OutlinedInput
                  id="plan-price-label"
                  label="套餐售价"
                  type="number"
                  value={values.price}
                  name="price"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.price && errors.price ? (
                  <FormHelperText error>{errors.price}</FormHelperText>
                ) : (
                  <FormHelperText>套餐标价金额，实际支付会按所选支付网关币种自动换算</FormHelperText>
                )}
              </FormControl>

              <FormControl
                fullWidth
                error={Boolean(touched.price_currency && errors.price_currency)}
                sx={{ ...theme.typography.otherInput }}
              >
                <InputLabel htmlFor="plan-price-currency-label">售价币种</InputLabel>
                <Select
                  id="plan-price-currency-label"
                  label="售价币种"
                  value={values.price_currency || 'USD'}
                  name="price_currency"
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  {PLAN_CURRENCY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {touched.price_currency && errors.price_currency ? (
                  <FormHelperText error>{errors.price_currency}</FormHelperText>
                ) : (
                  <FormHelperText>支持美元或人民币；套餐配额仍固定按 USD 结算</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.quota_amount && errors.quota_amount)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-quota-amount-label">配额额度 (USD)</InputLabel>
                <OutlinedInput
                  id="plan-quota-amount-label"
                  label="配额额度 (USD)"
                  type="number"
                  value={values.quota_amount}
                  name="quota_amount"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.quota_amount && errors.quota_amount ? (
                  <FormHelperText error>{errors.quota_amount}</FormHelperText>
                ) : (
                  <FormHelperText>套餐包含的配额，单位 USD，按 API 调用实际消耗扣减</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-duration-type-label">有效期类型</InputLabel>
                <Select
                  id="plan-duration-type-label"
                  label="有效期类型"
                  value={values.duration_type}
                  name="duration_type"
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value="day">日</MenuItem>
                  <MenuItem value="week">周</MenuItem>
                  <MenuItem value="month">月</MenuItem>
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                error={Boolean(touched.duration_count && errors.duration_count)}
                sx={{ ...theme.typography.otherInput }}
              >
                <InputLabel htmlFor="plan-duration-count-label">有效期数量</InputLabel>
                <OutlinedInput
                  id="plan-duration-count-label"
                  label="有效期数量"
                  type="number"
                  value={values.duration_count}
                  name="duration_count"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.duration_count && errors.duration_count && <FormHelperText error>{errors.duration_count}</FormHelperText>}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-sort-label">排序</InputLabel>
                <OutlinedInput
                  id="plan-sort-label"
                  label="排序"
                  type="number"
                  value={values.sort}
                  name="sort"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                <FormHelperText>越大越靠前</FormHelperText>
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-payment-product-label">支付商品名</InputLabel>
                <OutlinedInput
                  id="plan-payment-product-label"
                  label="支付商品名"
                  type="text"
                  value={values.payment_product}
                  name="payment_product"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                <FormHelperText>可选，映射到支付渠道的商品名称</FormHelperText>
              </FormControl>

              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.enable === true || values.enable === undefined}
                      onClick={() => {
                        setFieldValue('enable', !(values.enable === true || values.enable === undefined));
                      }}
                    />
                  }
                  label="启用"
                />
              </FormControl>

              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.allow_renewal === true || values.allow_renewal === undefined}
                      onClick={() => {
                        setFieldValue('allow_renewal', !(values.allow_renewal === true || values.allow_renewal === undefined));
                      }}
                    />
                  }
                  label="允许续订"
                />
              </FormControl>

              <DialogActions>
                <Button onClick={onCancel}>取消</Button>
                <Button disableElevation disabled={isSubmitting} type="submit" variant="contained" color="primary">
                  提交
                </Button>
              </DialogActions>
            </form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;

EditModal.propTypes = {
  open: PropTypes.bool,
  planId: PropTypes.number,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};
