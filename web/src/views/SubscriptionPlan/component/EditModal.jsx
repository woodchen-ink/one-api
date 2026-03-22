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
import { useTranslation } from 'react-i18next';

const validationSchema = Yup.object().shape({
  is_edit: Yup.boolean(),
  name: Yup.string().required('name is required'),
  group_symbol: Yup.string().required('group_symbol is required'),
  price: Yup.number().required('price is required').min(0),
  quota_amount: Yup.number().required('quota_amount is required').min(0),
  duration_type: Yup.string().oneOf(['day', 'week', 'month']).required(),
  duration_count: Yup.number().min(1).required(),
  sort: Yup.number()
});

const originInputs = {
  is_edit: false,
  name: '',
  group_symbol: '',
  description: '',
  features: '',
  price: 0,
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
  const { t } = useTranslation();

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);

    let res;
    values = trims(values);
    try {
      // Convert features string to array
      const submitValues = {
        ...values,
        price: parseFloat(values.price),
        quota_amount: parseFloat(values.quota_amount),
        duration_count: parseInt(values.duration_count, 10),
        sort: parseInt(values.sort, 10),
        features: values.features
          ? values.features
              .split('\n')
              .map((f) => f.trim())
              .filter((f) => f)
          : []
      };

      if (values.is_edit) {
        res = await API.put(`/api/subscription_plan/`, { ...submitValues, id: parseInt(planId) });
      } else {
        res = await API.post(`/api/subscription_plan/`, submitValues);
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('userPage.saveSuccess'));
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
        data.is_edit = true;
        // Convert features array to string for editing
        if (Array.isArray(data.features)) {
          data.features = data.features.join('\n');
        }
        setInputs(data);
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
        {planId ? t('common.edit') : t('common.create')}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={inputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, setFieldValue, handleSubmit, touched, values, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.name && errors.name)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-name-label">{t('subscriptionPlan.name')}</InputLabel>
                <OutlinedInput
                  id="plan-name-label"
                  label={t('subscriptionPlan.name')}
                  type="text"
                  value={values.name}
                  name="name"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-name-label"
                />
                {touched.name && errors.name && (
                  <FormHelperText error id="helper-text-plan-name-label">
                    {t(errors.name)}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.group_symbol && errors.group_symbol)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-group-symbol-label">{t('subscriptionPlan.groupSymbol')}</InputLabel>
                <OutlinedInput
                  id="plan-group-symbol-label"
                  label={t('subscriptionPlan.groupSymbol')}
                  type="text"
                  value={values.group_symbol}
                  name="group_symbol"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-group-symbol-label"
                />
                {touched.group_symbol && errors.group_symbol ? (
                  <FormHelperText error id="helper-text-plan-group-symbol-label">
                    {t(errors.group_symbol)}
                  </FormHelperText>
                ) : (
                  <FormHelperText id="helper-text-plan-group-symbol-label">{t('subscriptionPlan.groupSymbolTip')}</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-description-label">{t('subscriptionPlan.description')}</InputLabel>
                <OutlinedInput
                  id="plan-description-label"
                  label={t('subscriptionPlan.description')}
                  type="text"
                  value={values.description}
                  name="description"
                  multiline
                  rows={3}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-description-label"
                />
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-features-label">{t('subscriptionPlan.features')}</InputLabel>
                <OutlinedInput
                  id="plan-features-label"
                  label={t('subscriptionPlan.features')}
                  type="text"
                  value={values.features}
                  name="features"
                  multiline
                  rows={4}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-features-label"
                />
                <FormHelperText id="helper-text-plan-features-label">{t('subscriptionPlan.featuresTip')}</FormHelperText>
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.price && errors.price)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-price-label">{t('subscriptionPlan.price')}</InputLabel>
                <OutlinedInput
                  id="plan-price-label"
                  label={t('subscriptionPlan.price')}
                  type="number"
                  value={values.price}
                  name="price"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-price-label"
                />
                {touched.price && errors.price && (
                  <FormHelperText error id="helper-text-plan-price-label">
                    {t(errors.price)}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.quota_amount && errors.quota_amount)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-quota-amount-label">{t('subscriptionPlan.quotaAmount')}</InputLabel>
                <OutlinedInput
                  id="plan-quota-amount-label"
                  label={t('subscriptionPlan.quotaAmount')}
                  type="number"
                  value={values.quota_amount}
                  name="quota_amount"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-quota-amount-label"
                />
                {touched.quota_amount && errors.quota_amount && (
                  <FormHelperText error id="helper-text-plan-quota-amount-label">
                    {t(errors.quota_amount)}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-duration-type-label">{t('subscriptionPlan.durationType')}</InputLabel>
                <Select
                  id="plan-duration-type-label"
                  label={t('subscriptionPlan.durationType')}
                  value={values.duration_type}
                  name="duration_type"
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value="day">{t('subscriptionPlan.durationDay')}</MenuItem>
                  <MenuItem value="week">{t('subscriptionPlan.durationWeek')}</MenuItem>
                  <MenuItem value="month">{t('subscriptionPlan.durationMonth')}</MenuItem>
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                error={Boolean(touched.duration_count && errors.duration_count)}
                sx={{ ...theme.typography.otherInput }}
              >
                <InputLabel htmlFor="plan-duration-count-label">{t('subscriptionPlan.durationCount')}</InputLabel>
                <OutlinedInput
                  id="plan-duration-count-label"
                  label={t('subscriptionPlan.durationCount')}
                  type="number"
                  value={values.duration_count}
                  name="duration_count"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-duration-count-label"
                />
                {touched.duration_count && errors.duration_count && (
                  <FormHelperText error id="helper-text-plan-duration-count-label">
                    {t(errors.duration_count)}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-sort-label">{t('subscriptionPlan.sort')}</InputLabel>
                <OutlinedInput
                  id="plan-sort-label"
                  label={t('subscriptionPlan.sort')}
                  type="number"
                  value={values.sort}
                  name="sort"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-sort-label"
                />
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="plan-payment-product-label">{t('subscriptionPlan.paymentProduct')}</InputLabel>
                <OutlinedInput
                  id="plan-payment-product-label"
                  label={t('subscriptionPlan.paymentProduct')}
                  type="text"
                  value={values.payment_product}
                  name="payment_product"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-plan-payment-product-label"
                />
              </FormControl>

              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.enable}
                      onClick={() => {
                        setFieldValue('enable', !values.enable);
                      }}
                    />
                  }
                  label={t('subscriptionPlan.enable')}
                />
              </FormControl>

              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.allow_renewal}
                      onClick={() => {
                        setFieldValue('allow_renewal', !values.allow_renewal);
                      }}
                    />
                  }
                  label={t('subscriptionPlan.allowRenewal')}
                />
              </FormControl>

              <DialogActions>
                <Button onClick={onCancel}>{t('userPage.cancel')}</Button>
                <Button disableElevation disabled={isSubmitting} type="submit" variant="contained" color="primary">
                  {t('userPage.submit')}
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
