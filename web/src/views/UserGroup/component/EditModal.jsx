import PropTypes from 'prop-types';
import * as Yup from 'yup';
import { Formik } from 'formik';
import { useTheme } from '@mui/material/styles';
import { useContext, useState, useEffect, useMemo } from 'react';
import {
  Box,
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
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography
} from '@mui/material';
import { useSelector } from 'react-redux';
import { Icon } from '@iconify/react';

import { showSuccess, showError, trims } from 'utils/common';
import { API } from 'utils/api';
import { useTranslation } from 'react-i18next';
import { UserContext } from 'contexts/UserContext';

const validationSchema = Yup.object().shape({
  is_edit: Yup.boolean(),
  symbol: Yup.string().required('symbol is required'),
  name: Yup.string().required('name is required'),
  ratio: Yup.number().required('ratio is required'),
  promotion: Yup.boolean(),
  min: Yup.number(),
  max: Yup.number(),
  provider_ratios: Yup.array()
});

const originInputs = {
  is_edit: false,
  symbol: '',
  name: '',
  ratio: 1,
  public: false,
  api_rate: 300,
  promotion: false,
  min: 0,
  max: 0,
  provider_ratios: []
};

const normalizeProviderRatios = (providerRatios = []) => {
  const normalizedRules = [];
  const seenChannelTypes = new Set();

  for (let index = 0; index < providerRatios.length; index += 1) {
    const rule = providerRatios[index] || {};
    const channelType = Number.parseInt(rule.channel_type, 10);
    const ratio = Number.parseFloat(rule.ratio);
    const hasChannelType = Number.isFinite(channelType) && channelType > 0;
    const hasRatio = Number.isFinite(ratio) && ratio > 0;

    if (!hasChannelType && !hasRatio) {
      continue;
    }

    if (!hasChannelType) {
      return { error: `厂商倍率 #${index + 1} 请选择模型厂家` };
    }

    if (!hasRatio) {
      return { error: `厂商倍率 #${index + 1} 请输入大于 0 的倍率` };
    }

    if (seenChannelTypes.has(channelType)) {
      return { error: `厂商倍率 #${index + 1} 的模型厂家重复了` };
    }

    seenChannelTypes.add(channelType);
    normalizedRules.push({
      channel_type: channelType,
      ratio
    });
  }

  return { rules: normalizedRules };
};

const EditModal = ({ open, userGroupId, onCancel, onOk }) => {
  const theme = useTheme();
  const [inputs, setInputs] = useState(originInputs);
  const { t } = useTranslation();
  const { loadUser, loadUserGroup: reloadUserGroupMap } = useContext(UserContext);
  const ownedby = useSelector((state) => state.siteInfo?.ownedby || []);
  const ownedbyOptions = useMemo(() => {
    return [...ownedby].sort((a, b) => a.id - b.id);
  }, [ownedby]);

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);

    let res;
    values = trims(values);
    const normalizedProviderRatios = normalizeProviderRatios(values.provider_ratios || []);
    if (normalizedProviderRatios.error) {
      showError(normalizedProviderRatios.error);
      setSubmitting(false);
      return;
    }
    values.provider_ratios = normalizedProviderRatios.rules;

    try {
      if (values.is_edit) {
        res = await API.put(`/api/user_group/`, { ...values, id: parseInt(userGroupId) });
      } else {
        res = await API.post(`/api/user_group/`, values);
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('userPage.saveSuccess'));
        await loadUser();
        reloadUserGroupMap();
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

  const loadUserGroup = async () => {
    try {
      let res = await API.get(`/api/user_group/${userGroupId}`);
      const { success, message, data } = res.data;
      if (success) {
        setInputs({
          ...originInputs,
          ...data,
          is_edit: true,
          provider_ratios: data.provider_ratios || []
        });
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  useEffect(() => {
    if (userGroupId) {
      loadUserGroup().then();
    } else {
      setInputs(originInputs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userGroupId]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth={'md'}>
      <DialogTitle sx={{ margin: '0px', fontWeight: 700, lineHeight: '1.55556', padding: '24px', fontSize: '1.125rem' }}>
        {userGroupId ? t('common.edit') : t('common.create')}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Formik initialValues={inputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, setFieldValue, handleSubmit, touched, values, isSubmitting }) => (
            <form noValidate onSubmit={handleSubmit}>
              {/*
                管理员界面直接展示中文，避免增加额外理解成本。
              */}
              <FormControl fullWidth error={Boolean(touched.symbol && errors.symbol)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="channel-symbol-label">{t('userGroup.symbol')}</InputLabel>
                <OutlinedInput
                  id="channel-symbol-label"
                  label={t('userGroup.symbol')}
                  type="text"
                  value={values.symbol}
                  name="symbol"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  inputProps={{ autoComplete: 'symbol' }}
                  aria-describedby="helper-text-channel-symbol-label"
                />
                {touched.symbol && errors.symbol ? (
                  <FormHelperText error id="helper-tex-channel-symbol-label">
                    {t(errors.symbol)}
                  </FormHelperText>
                ) : (
                  <FormHelperText id="helper-tex-channel-type-label"> {t('userGroup.symbolTip')} </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.name && errors.name)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="channel-name-label">{t('userGroup.name')}</InputLabel>
                <OutlinedInput
                  id="channel-name-label"
                  label={t('userGroup.name')}
                  type="text"
                  value={values.name}
                  name="name"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  inputProps={{ autoComplete: 'name' }}
                  aria-describedby="helper-text-channel-name-label"
                />
                {touched.name && errors.name ? (
                  <FormHelperText error id="helper-tex-channel-name-label">
                    {t(errors.name)}
                  </FormHelperText>
                ) : (
                  <FormHelperText id="helper-tex-channel-type-label"> {t('userGroup.nameTip')} </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.ratio && errors.ratio)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="channel-ratio-label">{t('userGroup.ratio')}</InputLabel>
                <OutlinedInput
                  id="channel-ratio-label"
                  label={t('userGroup.ratio')}
                  type="number"
                  value={values.ratio}
                  name="ratio"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-channel-ratio-label"
                />

                {touched.ratio && errors.ratio && (
                  <FormHelperText error id="helper-tex-channel-ratio-label">
                    {t(errors.ratio)}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.api_rate && errors.api_rate)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="channel-api-rate-label">{t('userGroup.apiRate')}</InputLabel>
                <OutlinedInput
                  id="channel-api-rate-label"
                  label={t('userGroup.apiRate')}
                  type="number"
                  value={values.api_rate}
                  name="api_rate"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-channel-api-rate-label"
                />

                {touched.api_rate && errors.api_rate ? (
                  <FormHelperText error id="helper-tex-channel-api-rate-label">
                    {t(errors.api_rate)}
                  </FormHelperText>
                ) : (
                  <FormHelperText id="helper-tex-channel-api-rate-label"> {t('userGroup.apiRateTip')} </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.promotion}
                      onClick={() => {
                        setFieldValue('promotion', !values.promotion);
                      }}
                    />
                  }
                  label={t('userGroup.promotion')}
                />
                <FormHelperText id="helper-tex-channel-promotion-label"> {t('userGroup.promotionTip')} </FormHelperText>
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.min && errors.min)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="channel-min-label">{t('userGroup.min')}</InputLabel>
                <OutlinedInput
                  id="channel-min-label"
                  label={t('userGroup.min')}
                  type="number"
                  value={values.min}
                  name="min"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-channel-min-label"
                />
                {touched.min && errors.min ? (
                  <FormHelperText error id="helper-tex-channel-min-label">
                    {t(errors.min)}
                  </FormHelperText>
                ) : (
                  <FormHelperText id="helper-tex-channel-min-label"> {t('userGroup.minTip')} </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth error={Boolean(touched.max && errors.max)} sx={{ ...theme.typography.otherInput }}>
                <InputLabel htmlFor="channel-max-label">{t('userGroup.max')}</InputLabel>
                <OutlinedInput
                  id="channel-max-label"
                  label={t('userGroup.max')}
                  type="number"
                  value={values.max}
                  name="max"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-describedby="helper-text-channel-max-label"
                />
                {touched.max && errors.max ? (
                  <FormHelperText error id="helper-tex-channel-max-label">
                    {t(errors.max)}
                  </FormHelperText>
                ) : (
                  <FormHelperText id="helper-tex-channel-max-label"> {t('userGroup.maxTip')} </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.public}
                      onClick={() => {
                        setFieldValue('public', !values.public);
                      }}
                    />
                  }
                  label={t('userGroup.public')}
                />
                <FormHelperText id="helper-tex-channel-public-label">{t('userGroup.publicTip')}</FormHelperText>
              </FormControl>

              <Box
                sx={{
                  ...theme.typography.otherInput,
                  p: 2,
                  borderRadius: 2,
                  border: (themeValue) => `1px solid ${themeValue.palette.divider}`,
                  backgroundColor: (themeValue) => (themeValue.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)')
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle2">{t('userGroup.providerRatios')}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('userGroup.providerRatiosTip')}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Icon icon="ic:baseline-add" />}
                    onClick={() => {
                      setFieldValue('provider_ratios', [...(values.provider_ratios || []), { channel_type: '', ratio: '' }]);
                    }}
                  >
                    {t('userGroup.addProviderRatio')}
                  </Button>
                </Stack>

                {(values.provider_ratios || []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('userGroup.noProviderRatios')}
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {(values.provider_ratios || []).map((rule, index) => (
                      <Box
                        key={`provider-ratio-${index}`}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          border: (themeValue) => `1px solid ${themeValue.palette.divider}`
                        }}
                      >
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                          <FormControl fullWidth>
                            <InputLabel>{t('userGroup.provider')}</InputLabel>
                            <Select
                              label={t('userGroup.provider')}
                              value={rule?.channel_type ?? ''}
                              onChange={(event) => {
                                const nextRules = [...(values.provider_ratios || [])];
                                nextRules[index] = {
                                  ...nextRules[index],
                                  channel_type: event.target.value
                                };
                                setFieldValue('provider_ratios', nextRules);
                              }}
                            >
                              {ownedbyOptions.map((item) => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <FormControl fullWidth>
                            <InputLabel>{t('userGroup.providerRatioValue')}</InputLabel>
                            <OutlinedInput
                              label={t('userGroup.providerRatioValue')}
                              type="number"
                              value={rule?.ratio ?? ''}
                              onBlur={handleBlur}
                              onChange={(event) => {
                                const nextRules = [...(values.provider_ratios || [])];
                                nextRules[index] = {
                                  ...nextRules[index],
                                  ratio: event.target.value
                                };
                                setFieldValue('provider_ratios', nextRules);
                              }}
                              startAdornment={<Typography sx={{ color: 'text.secondary', mr: 0.75 }}>x</Typography>}
                            />
                          </FormControl>

                          <IconButton
                            color="error"
                            onClick={() => {
                              setFieldValue(
                                'provider_ratios',
                                (values.provider_ratios || []).filter((_, ruleIndex) => ruleIndex !== index)
                              );
                            }}
                          >
                            <Icon icon="mdi:delete" width={18} />
                          </IconButton>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

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
  userGroupId: PropTypes.number,
  onCancel: PropTypes.func,
  onOk: PropTypes.func
};
