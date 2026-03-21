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
  FormHelperText
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
  sort: 0,
  status: 1
};

const EditModal = ({ open, tutorialId, onCancel, onOk }) => {
  const theme = useTheme();
  const [inputs, setInputs] = useState(originInputs);

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);
    values = trims(values);
    let res;
    try {
      if (values.is_edit) {
        res = await API.put(`/api/tutorial/`, { ...values, id: parseInt(tutorialId) });
      } else {
        res = await API.post(`/api/tutorial/`, values);
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

  const loadTutorial = async () => {
    try {
      let res = await API.get(`/api/tutorial/${tutorialId}`);
      const { success, message, data } = res.data;
      if (success) {
        data.is_edit = true;
        setInputs(data);
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  useEffect(() => {
    if (tutorialId) {
      loadTutorial().then();
    } else {
      setInputs(originInputs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialId]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth={'md'}>
      <DialogTitle sx={{ margin: '0px', fontWeight: 700, lineHeight: '1.55556', padding: '24px', fontSize: '1.125rem' }}>
        {tutorialId ? '编辑教程' : '新建教程'}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={inputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, handleSubmit, touched, values, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.title && errors.title)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="tutorial-title-label">标题</InputLabel>
                <OutlinedInput
                  id="tutorial-title-label"
                  label="标题"
                  type="text"
                  value={values.title}
                  name="title"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.title && errors.title && (
                  <FormHelperText error id="helper-text-tutorial-title">
                    {errors.title}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="tutorial-content-label">内容 (Markdown)</InputLabel>
                <OutlinedInput
                  id="tutorial-content-label"
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
                <InputLabel htmlFor="tutorial-sort-label">排序 (数值越大越靠前)</InputLabel>
                <OutlinedInput
                  id="tutorial-sort-label"
                  label="排序 (数值越大越靠前)"
                  type="number"
                  value={values.sort}
                  name="sort"
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.sort && errors.sort && (
                  <FormHelperText error id="helper-text-tutorial-sort">
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
  tutorialId: PropTypes.number,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};
