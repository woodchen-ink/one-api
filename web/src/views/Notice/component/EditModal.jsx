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
  TextField
} from '@mui/material';

import { showSuccess, showError, trims } from 'utils/common';
import { API } from 'utils/api';

const validationSchema = Yup.object().shape({
  title: Yup.string().required('标题不能为空'),
  sort: Yup.number().min(0, '排序值不能为负数')
});

const originInputs = {
  is_edit: false,
  title: '',
  content: '',
  publish_time: 0,
  sort: 0,
  status: 1
};

// Convert unix timestamp (seconds) to datetime-local input value
const timestampToDatetimeLocal = (ts) => {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

// Convert datetime-local input value to unix timestamp (seconds)
const datetimeLocalToTimestamp = (val) => {
  if (!val) return 0;
  return Math.floor(new Date(val).getTime() / 1000);
};

const EditModal = ({ open, noticeId, onCancel, onOk }) => {
  const theme = useTheme();
  const [inputs, setInputs] = useState(originInputs);

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);
    values = trims(values);
    // Convert publish_time_local back to timestamp
    const payload = { ...values };
    if (payload.publish_time_local) {
      payload.publish_time = datetimeLocalToTimestamp(payload.publish_time_local);
    }
    delete payload.publish_time_local;
    delete payload.is_edit;

    let res;
    try {
      if (values.is_edit) {
        res = await API.put(`/api/notice/`, { ...payload, id: parseInt(noticeId) });
      } else {
        res = await API.post(`/api/notice/`, payload);
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess(values.is_edit ? '更新成功' : '创建成功');
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

  const loadNotice = async () => {
    try {
      let res = await API.get(`/api/notice/${noticeId}`);
      const { success, message, data } = res.data;
      if (success) {
        data.is_edit = true;
        data.publish_time_local = timestampToDatetimeLocal(data.publish_time);
        setInputs(data);
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  useEffect(() => {
    if (noticeId) {
      loadNotice().then();
    } else {
      // Set default publish time to now
      const now = { ...originInputs };
      now.publish_time_local = timestampToDatetimeLocal(Math.floor(Date.now() / 1000));
      setInputs(now);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth={'md'}>
      <DialogTitle sx={{ margin: '0px', fontWeight: 700, lineHeight: '1.55556', padding: '24px', fontSize: '1.125rem' }}>
        {noticeId ? '编辑公告' : '新建公告'}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={inputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, handleSubmit, touched, values, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.title && errors.title)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="notice-title-label">标题</InputLabel>
                <OutlinedInput
                  id="notice-title-label"
                  label="标题"
                  type="text"
                  value={values.title}
                  name="title"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.title && errors.title && (
                  <FormHelperText error id="helper-text-notice-title">
                    {errors.title}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <TextField
                  id="notice-publish-time"
                  label="发布时间"
                  type="datetime-local"
                  value={values.publish_time_local || ''}
                  name="publish_time_local"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="notice-content-label">内容 (Markdown)</InputLabel>
                <OutlinedInput
                  id="notice-content-label"
                  label="内容 (Markdown)"
                  type="text"
                  value={values.content}
                  name="content"
                  multiline
                  rows={15}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  sx={{
                    fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
                    fontSize: '0.85rem'
                  }}
                  placeholder="支持 Markdown 格式"
                />
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.sort && errors.sort)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="notice-sort-label">排序 (数值越大越靠前)</InputLabel>
                <OutlinedInput
                  id="notice-sort-label"
                  label="排序 (数值越大越靠前)"
                  type="number"
                  value={values.sort}
                  name="sort"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.sort && errors.sort && (
                  <FormHelperText error id="helper-text-notice-sort">
                    {errors.sort}
                  </FormHelperText>
                )}
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
  noticeId: PropTypes.number,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};
