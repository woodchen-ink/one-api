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
  FormHelperText,
  Select,
  MenuItem
} from '@mui/material';

import { showSuccess, showError } from 'utils/common';
import { API } from 'utils/api';
import { useTranslation } from 'react-i18next';

const validationSchema = Yup.object().shape({
  user_id: Yup.number().required('user_id is required').min(1),
  plan_id: Yup.number().required('plan_id is required').min(1)
});

const originInputs = {
  user_id: '',
  plan_id: ''
};

const AssignModal = ({ open, onCancel, onOk }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);

  const loadPlans = async () => {
    try {
      const res = await API.get(`/api/subscription_plan/`, {
        params: {
          page: 1,
          size: 100
        }
      });
      const { success, message, data } = res.data;
      if (success) {
        setPlans(data.data || []);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (open) {
      loadPlans();
    }
  }, [open]);

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);
    try {
      const submitValues = {
        user_id: parseInt(values.user_id, 10),
        plan_id: parseInt(values.plan_id, 10)
      };

      const res = await API.post(`/api/user_subscription/admin/assign`, submitValues);
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

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth={'sm'}>
      <DialogTitle sx={{ margin: '0px', fontWeight: 700, lineHeight: '1.55556', padding: '24px', fontSize: '1.125rem' }}>
        {t('userSubscription.assign')}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={originInputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, handleSubmit, touched, values, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.user_id && errors.user_id)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="assign-user-id-label">{t('userSubscription.userId')}</InputLabel>
                <OutlinedInput
                  id="assign-user-id-label"
                  label={t('userSubscription.userId')}
                  type="number"
                  value={values.user_id}
                  name="user_id"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-assign-user-id-label"
                />
                {touched.user_id && errors.user_id && (
                  <FormHelperText error id="helper-text-assign-user-id-label">
                    {t(errors.user_id)}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.plan_id && errors.plan_id)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="assign-plan-id-label">{t('userSubscription.planName')}</InputLabel>
                <Select
                  id="assign-plan-id-label"
                  label={t('userSubscription.planName')}
                  value={values.plan_id}
                  name="plan_id"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 200
                      }
                    }
                  }}
                >
                  {plans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.group_symbol})
                    </MenuItem>
                  ))}
                </Select>
                {touched.plan_id && errors.plan_id && (
                  <FormHelperText error id="helper-text-assign-plan-id-label">
                    {t(errors.plan_id)}
                  </FormHelperText>
                )}
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

export default AssignModal;

AssignModal.propTypes = {
  open: PropTypes.bool,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};
