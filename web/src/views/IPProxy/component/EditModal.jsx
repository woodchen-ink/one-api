import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { Formik } from 'formik';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  OutlinedInput
} from '@mui/material';
import { API } from 'utils/api';
import { showError, showSuccess, trims } from 'utils/common';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('请输入代理名称'),
  proxy: Yup.string().required('请输入代理地址')
});

const originInputs = {
  name: '',
  proxy: '',
  remark: ''
};

const EditModal = ({ open, proxyId, onCancel, onOk }) => {
  const [inputs, setInputs] = useState(originInputs);

  // 加载已有代理配置，供编辑弹窗回显。
  const loadProxy = async () => {
    try {
      const res = await API.get(`/api/ip_proxy/${proxyId}`);
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }

      setInputs({
        name: data.name || '',
        proxy: data.proxy || '',
        remark: data.remark || ''
      });
    } catch (error) {
      showError(error.message);
    }
  };

  // 保存代理池配置，并在成功后通知父级刷新列表。
  const submit = async (values, { setSubmitting, setErrors }) => {
    setSubmitting(true);
    const payload = trims(values);

    try {
      const res = proxyId ? await API.put('/api/ip_proxy/', { ...payload, id: proxyId }) : await API.post('/api/ip_proxy/', payload);
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        setErrors({ submit: message });
        return;
      }

      showSuccess(proxyId ? '代理已更新' : '代理已新增');
      onOk(true);
    } catch (error) {
      showError(error.message);
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (proxyId) {
      loadProxy().then();
      return;
    }

    setInputs(originInputs);
  }, [open, proxyId]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>{proxyId ? '编辑IP代理' : '新增IP代理'}</DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={inputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.name && errors.name)} sx={{ mt: 2 }}>
                <InputLabel htmlFor="ip-proxy-name">代理名称</InputLabel>
                <OutlinedInput
                  id="ip-proxy-name"
                  label="代理名称"
                  name="name"
                  value={values.name}
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.name && errors.name ? (
                  <FormHelperText error>{errors.name}</FormHelperText>
                ) : (
                  <FormHelperText>用于渠道列表和渠道配置弹窗中的识别名称</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.proxy && errors.proxy)} sx={{ mt: 2 }}>
                <InputLabel htmlFor="ip-proxy-address">代理地址</InputLabel>
                <OutlinedInput
                  id="ip-proxy-address"
                  label="代理地址"
                  name="proxy"
                  value={values.proxy}
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                {touched.proxy && errors.proxy ? (
                  <FormHelperText error>{errors.proxy}</FormHelperText>
                ) : (
                  <FormHelperText>支持 `http://`、`https://`、`socks5://`、`socks5h://`，例如 `socks5://用户名:密码@ip:端口`</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel htmlFor="ip-proxy-remark">备注</InputLabel>
                <OutlinedInput
                  id="ip-proxy-remark"
                  label="备注"
                  name="remark"
                  value={values.remark}
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
                <FormHelperText>可选，用于记录线路来源、地区或用途</FormHelperText>
              </FormControl>

              <DialogActions sx={{ px: 0, pt: 3 }}>
                <Button onClick={onCancel}>取消</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  保存
                </Button>
              </DialogActions>
            </form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

EditModal.propTypes = {
  open: PropTypes.bool,
  proxyId: PropTypes.number,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};

export default EditModal;
