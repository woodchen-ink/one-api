import PropTypes from 'prop-types';
import * as Yup from 'yup';
import { Formik } from 'formik';
import { useTheme } from '@mui/material/styles';
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
  FormHelperText
} from '@mui/material';

import { showSuccess, showError } from 'utils/common';
import { API } from 'utils/api';

const validationSchema = Yup.object().shape({
  adjust_days: Yup.number().integer(),
  expire_time: Yup.string()
});

const originInputs = {
  adjust_days: 0,
  expire_time: ''
};

const AdjustModal = ({ open, subscriptionId, onCancel, onOk }) => {
  const theme = useTheme();

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);
    try {
      const submitValues = {};
      if (values.adjust_days) {
        submitValues.adjust_days = parseInt(values.adjust_days, 10);
      }
      if (values.expire_time) {
        submitValues.expire_time = Math.floor(new Date(values.expire_time).getTime() / 1000);
      }

      const res = await API.put(`/api/user_subscription/admin/adjust/${subscriptionId}`, submitValues);
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

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth={'sm'}>
      <DialogTitle sx={{ margin: '0px', fontWeight: 700, lineHeight: '1.55556', padding: '24px', fontSize: '1.125rem' }}>
        调整到期时间
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={originInputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, handleSubmit, touched, values, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.adjust_days && errors.adjust_days)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="adjust-days-label">调整天数</InputLabel>
                <OutlinedInput
                  id="adjust-days-label"
                  label="调整天数"
                  type="number"
                  value={values.adjust_days}
                  name="adjust_days"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.adjust_days && errors.adjust_days ? (
                  <FormHelperText error>{errors.adjust_days}</FormHelperText>
                ) : (
                  <FormHelperText>正数延长，负数缩短</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="adjust-expire-time-label" shrink>
                  设置到期时间
                </InputLabel>
                <OutlinedInput
                  id="adjust-expire-time-label"
                  label="设置到期时间"
                  type="datetime-local"
                  value={values.expire_time}
                  name="expire_time"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  notched
                />
                <FormHelperText>直接设置到期时间，优先于天数调整</FormHelperText>
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

export default AdjustModal;

AdjustModal.propTypes = {
  open: PropTypes.bool,
  subscriptionId: PropTypes.number,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};
