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

const validationSchema = Yup.object().shape({
  user_id: Yup.number().required('用户ID不能为空').min(1, '用户ID必须大于0'),
  plan_id: Yup.number().required('请选择套餐').min(1, '请选择套餐')
});

const originInputs = {
  user_id: '',
  plan_id: ''
};

const AssignModal = ({ open, onCancel, onOk }) => {
  const theme = useTheme();
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
        showSuccess('分配成功');
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
        分配订阅
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={originInputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, handleSubmit, touched, values, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.user_id && errors.user_id)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="assign-user-id-label">用户ID</InputLabel>
                <OutlinedInput
                  id="assign-user-id-label"
                  label="用户ID"
                  type="number"
                  value={values.user_id}
                  name="user_id"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.user_id && errors.user_id && <FormHelperText error>{errors.user_id}</FormHelperText>}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.plan_id && errors.plan_id)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="assign-plan-id-label">选择套餐</InputLabel>
                <Select
                  id="assign-plan-id-label"
                  label="选择套餐"
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
                      {plan.name} ({plan.group_symbol}) - ${plan.price}
                    </MenuItem>
                  ))}
                </Select>
                {touched.plan_id && errors.plan_id && <FormHelperText error>{errors.plan_id}</FormHelperText>}
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

export default AssignModal;

AssignModal.propTypes = {
  open: PropTypes.bool,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};
