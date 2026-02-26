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
  Autocomplete,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
  Alert
} from '@mui/material';

import { showSuccess, showError, trims } from 'utils/common';
import { API } from 'utils/api';
import { useTranslation } from 'react-i18next';

const validationSchema = Yup.object().shape({
  alias: Yup.string().required('别名不能为空')
});

const originInputs = {
  is_edit: false,
  alias: '',
  target_models: [],
  enabled: true
};

const EditModal = ({ open, Oid, onCancel, onOk }) => {
  const theme = useTheme();
  const [inputs, setInputs] = useState(originInputs);
  const [modelOptions, setModelOptions] = useState([]);
  const { t } = useTranslation();

  const fetchModels = async () => {
    try {
      const res = await API.get('/api/available_model');
      const { success, data } = res.data;
      if (success && data) {
        setModelOptions(Object.keys(data).sort());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);

    let res;
    const payload = trims({
      ...values,
      target_models: JSON.stringify(values.target_models)
    });

    try {
      if (values.is_edit) {
        res = await API.put('/api/model_mapping/', { ...payload, id: Oid });
      } else {
        res = await API.post('/api/model_mapping/', payload);
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

  const loadMapping = async () => {
    try {
      let res = await API.get(`/api/model_mapping/${Oid}`);
      const { success, message, data } = res.data;
      if (success) {
        let targetModels = [];
        try {
          targetModels = JSON.parse(data.target_models);
        } catch {
          targetModels = [];
        }
        setInputs({
          is_edit: true,
          alias: data.alias,
          target_models: targetModels,
          enabled: data.enabled
        });
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  useEffect(() => {
    if (open) {
      fetchModels();
      if (Oid) {
        loadMapping();
      } else {
        setInputs(originInputs);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Oid, open]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth={'md'}>
      <DialogTitle sx={{ margin: '0px', fontWeight: 700, lineHeight: '1.55556', padding: '24px', fontSize: '1.125rem' }}>
        {Oid ? t('common.edit') : t('common.create')}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={inputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, handleSubmit, touched, values, isSubmitting, setFieldValue }) => (
            <form noValidate onSubmit={handleSubmit}>
              <FormControl fullWidth error={Boolean(touched.alias && errors.alias)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="mapping-alias-label">{t('modelMapping.alias', '别名')}</InputLabel>
                <OutlinedInput
                  id="mapping-alias-label"
                  label={t('modelMapping.alias', '别名')}
                  type="text"
                  value={values.alias}
                  name="alias"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-mapping-alias"
                  disabled={values.is_edit}
                />
                {touched.alias && errors.alias ? (
                  <FormHelperText error id="helper-text-mapping-alias">
                    {errors.alias}
                  </FormHelperText>
                ) : (
                  <FormHelperText id="helper-text-mapping-alias">
                    {t('modelMapping.aliasTip', '用户请求时使用的模型名称，如 free-model')}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth sx={{ ...theme.typography.otherInput }}>
                <Autocomplete
                  multiple
                  freeSolo
                  id="mapping-target-models"
                  options={modelOptions}
                  value={values.target_models}
                  onChange={(event, newValue) => {
                    setFieldValue('target_models', newValue);
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const isUnavailable = modelOptions.length > 0 && !modelOptions.includes(option);
                      const chip = (
                        <Chip
                          size="small"
                          label={option}
                          color={isUnavailable ? 'warning' : 'default'}
                          variant={isUnavailable ? 'filled' : 'outlined'}
                          {...getTagProps({ index })}
                        />
                      );
                      return isUnavailable ? (
                        <Tooltip key={option} title={t('modelMapping.modelUnavailable', '该模型当前不可用')} arrow>
                          {chip}
                        </Tooltip>
                      ) : (
                        chip
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('modelMapping.targetModels', '目标模型')}
                      placeholder={t('modelMapping.targetModelsPlaceholder', '输入或选择目标模型')}
                      helperText={t(
                        'modelMapping.targetModelsTip',
                        '选择要映射的真实模型，请求将在这些模型的渠道间负载均衡'
                      )}
                    />
                  )}
                />
                {modelOptions.length > 0 &&
                  values.target_models.some((m) => !modelOptions.includes(m)) && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      {t('modelMapping.unavailableWarning', '部分目标模型当前不可用，请检查对应渠道是否已启用')}
                    </Alert>
                  )}
              </FormControl>

              <FormControl sx={{ ...theme.typography.otherInput }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.enabled}
                      onChange={(event) => {
                        setFieldValue('enabled', event.target.checked);
                      }}
                    />
                  }
                  label={t('modelMapping.enabledLabel', '启用')}
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
  Oid: PropTypes.number,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};
