import PropTypes from 'prop-types';
import * as Yup from 'yup';
import { Formik } from 'formik'; // 1. 导入 useFormikContext
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import ModelLimitSelector from './ModelLimitSelector';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Box,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Switch,
  FormControlLabel,
  FormHelperText,
  Select,
  MenuItem,
  Stack,
  Typography,
  Grid,
  TextField
} from '@mui/material';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { showSuccess, showError } from 'utils/common'; //renderQuotaWithPrompt,
import { API } from 'utils/api';
import { useTranslation } from 'react-i18next';
import 'dayjs/locale/zh-cn';

let quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit'));

const mergeBackupGroups = (backupGroup, fallbackGroups = []) => {
  const groups = [];
  [backupGroup, ...fallbackGroups].forEach((group) => {
    if (!group || groups.includes(group)) {
      return;
    }
    groups.push(group);
  });
  return groups;
};

const splitBackupGroups = (backupGroups = []) => {
  const normalizedGroups = backupGroups.filter((group, index) => group && backupGroups.indexOf(group) === index);
  return {
    backupGroup: normalizedGroups[0] || '',
    fallbackGroups: normalizedGroups.slice(1)
  };
};

const validationSchema = Yup.object().shape({
  is_edit: Yup.boolean(),
  name: Yup.string().required('名称 不能为空'),
  remain_quota: Yup.number().min(0, '必须大于等于0'),
  expired_time: Yup.number(),
  unlimited_quota: Yup.boolean(),
  setting: Yup.object().shape({
    heartbeat: Yup.object().shape({
      enabled: Yup.boolean(),
      timeout_seconds: Yup.number().when('enabled', {
        is: true,
        then: () => Yup.number().min(30, '时间 必须大于等于30秒').max(90, '时间 必须小于等于90秒').required('时间 不能为空'),
        otherwise: () => Yup.number()
      })
    }),
    limits: Yup.object().shape({
      limits_ip_setting: Yup.object().shape({
        enabled: Yup.boolean(),
        whitelist: Yup.array().of(Yup.string())
      })
    })
  })
});

const originInputs = {
  is_edit: false,
  name: '默认key',
  remain_quota: 0,
  expired_time: -1,
  unlimited_quota: true,
  group: '',
  backup_group: '',
  backup_groups: [],
  setting: {
    heartbeat: {
      enabled: false,
      timeout_seconds: 30
    },
    limits: {
      limit_model_setting: {
        enabled: false,
        models: []
      },
      limits_ip_setting: {
        enabled: false,
        whitelist: []
      }
    }
  }
};

const EditModal = ({ open, keyId, onCancel, onOk, userGroupOptions, adminMode = false, presetGroup = '', presetPlanName = '' }) => {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState(originInputs);
  const [modelOptions, setModelOptions] = useState([]);
  const [ownedByIcons, setOwnedByIcons] = useState({});
  const [activeSubscriptionGroups, setActiveSubscriptionGroups] = useState([]);
  const fetchOwnedByIcons = async () => {
    try {
      const res = await API.get('/api/model_ownedby/');
      const { success, data } = res.data;
      if (success) {
        const iconMap = {};
        data.forEach((provider) => {
          iconMap[provider.name] = provider.icon || '/src/assets/images/icons/unknown_type.svg';
        });
        setOwnedByIcons(iconMap);
      }
    } catch (error) {
      console.error('获取模型提供商图标失败:', error);
    }
  };

  const fetchModelOptions = async () => {
    try {
      const res = await API.get('/api/available_model');
      const { success, data } = res.data;
      if (success) {
        const models = Object.keys(data).map((modelId) => ({
          id: modelId,
          name: modelId,
          owned_by: data[modelId].owned_by,
          groups: data[modelId].groups,
          price: data[modelId].price
        }));
        setModelOptions(models);
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const getModelIcon = (ownedBy) => {
    return ownedByIcons[ownedBy] || '/src/assets/images/icons/unknown_type.svg';
  };

  const submit = async (values, { setErrors, setStatus, setSubmitting }) => {
    setSubmitting(true);
    const { backupGroup, fallbackGroups } = splitBackupGroups(values.backup_groups);
    const payload = {
      ...values,
      remain_quota: parseFloat(values.remain_quota) * quotaPerUnit,
      backup_group: backupGroup,
      setting: {
        ...values.setting,
        heartbeat: {
          ...values.setting.heartbeat,
          timeout_seconds: parseInt(values.setting.heartbeat.timeout_seconds)
        },
        limits: {
          ...values.setting.limits,
          limits_ip_setting: {
            ...values.setting?.limits?.limits_ip_setting,
            whitelist: values.setting?.limits?.limits_ip_setting?.whitelist?.filter((ip) => ip.trim() !== '') || []
          }
        },
        fallback_groups: fallbackGroups
      }
    };
    delete payload.backup_groups;

    let res;
    try {
      if (values.is_edit) {
        // 管理员模式使用管理员专用接口
        const apiPath = adminMode ? `/api/key/admin` : `/api/key/`;
        payload.id = parseInt(keyId);
        // 管理员模式下传递 user_id
        if (adminMode && values.user_id) {
          payload.user_id = parseInt(values.user_id);
        }
        res = await API.put(apiPath, payload);
      } else {
        res = await API.post(`/api/key/`, payload);
      }
      const { success, message } = res.data;
      if (success) {
        if (values.is_edit) {
          showSuccess('Key更新成功！');
        } else {
          showSuccess('Key创建成功，请在列表页面点击复制获取Key！');
        }
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

  const loadToken = async () => {
    try {
      let res;
      if (adminMode) {
        // 管理员模式使用搜索接口通过 key_id 查询
        res = await API.get(`/api/key/admin/search`, {
          params: { key_id: keyId, page: 1, size: 1 }
        });
      } else {
        res = await API.get(`/api/key/${keyId}`);
      }
      const { success, message, data } = res.data;
      if (success) {
        // 管理员搜索接口返回的是分页数据，取第一条
        const tokenData = adminMode ? data.data[0] : data;
        if (!tokenData) {
          showError('Key不存在');
          return;
        }
        tokenData.is_edit = true;
        // 如果data.remain_quota是数字，则转换为美金单位
        if (typeof data.remain_quota === 'number') {
          data.remain_quota = data.remain_quota / quotaPerUnit;
        }
        if (!tokenData.setting) tokenData.setting = originInputs.setting;
        if (!tokenData.setting.limits) tokenData.setting.limits = originInputs.setting.limits;
        if (!tokenData.setting.limits.limit_model_setting)
          tokenData.setting.limits.limit_model_setting = originInputs.setting.limits.limit_model_setting;
        if (!tokenData.setting.limits.limits_ip_setting)
          tokenData.setting.limits.limits_ip_setting = originInputs.setting.limits.limits_ip_setting;
        if (!tokenData.setting.fallback_groups) tokenData.setting.fallback_groups = [];
        if (!tokenData.setting.limits.limit_model_setting.models) tokenData.setting.limits.limit_model_setting.models = [];
        if (!tokenData.setting.limits.limits_ip_setting.whitelist) tokenData.setting.limits.limits_ip_setting.whitelist = [];
        tokenData.backup_groups = mergeBackupGroups(tokenData.backup_group, tokenData.setting.fallback_groups);
        setInputs(tokenData);
      } else {
        showError(message);
      }
    } catch (error) {
      return;
    }
  };

  useEffect(() => {
    if (open) {
      fetchOwnedByIcons();
      fetchModelOptions();
    }
  }, [open]);

  useEffect(() => {
    if (!open || adminMode) {
      setActiveSubscriptionGroups([]);
      return;
    }

    const fetchSubscriptionGroups = async () => {
      try {
        const res = await API.get('/api/user/subscription/groups');
        const { success, data } = res.data;
        if (success) {
          setActiveSubscriptionGroups(data || []);
        }
      } catch (error) {
        setActiveSubscriptionGroups([]);
      }
    };

    fetchSubscriptionGroups();
  }, [open, adminMode]);

  useEffect(() => {
    if (keyId) {
      loadToken().then();
    } else {
      setInputs({
        ...originInputs,
        group: presetGroup || ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyId, adminMode, presetGroup]);

  const sortedUserGroupOptions = useMemo(() => {
    const activeSet = new Set(activeSubscriptionGroups);
    return [...userGroupOptions].sort((a, b) => {
      const aActive = activeSet.has(a.value);
      const bActive = activeSet.has(b.value);
      if (aActive === bActive) return 0;
      return aActive ? -1 : 1;
    });
  }, [activeSubscriptionGroups, userGroupOptions]);

  const sectionSx = {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    p: 2
  };

  const sectionHeaderSx = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    mb: 1.5
  };

  const compactFieldSx = {
    mt: 0
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          maxHeight: '88vh'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, px: 2.5, py: 2, fontWeight: 700, lineHeight: 1.4, fontSize: '1.05rem' }}>
        {keyId ? t('token_index.editToken') : t('token_index.createToken')}
      </DialogTitle>
      <DialogContent dividers sx={{ px: 2.5, py: 2 }}>
        <Formik initialValues={inputs} enableReinitialize validationSchema={validationSchema} onSubmit={submit}>
          {({ errors, handleBlur, handleChange, handleSubmit, touched, values, setFieldError, setFieldValue, isSubmitting }) => (
            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!values.is_edit && presetGroup && (
                <Alert severity="success" sx={{ mb: -0.5 }}>
                  {t('token_index.subscriptionPresetGroupTip', {
                    group: presetGroup,
                    plan: presetPlanName || presetGroup
                  })}
                </Alert>
              )}

              {/* 管理员模式下显示用户转移字段 */}
              {adminMode && values.is_edit && (
                <>
                  <Alert severity="warning" sx={{ mb: -0.5 }}>
                    {t('token_index.adminEditWarning')}
                  </Alert>
                  <FormControl fullWidth sx={{ ...compactFieldSx }}>
                    <InputLabel htmlFor="token-user-id-label">{t('token_index.transferToUser')}</InputLabel>
                    <OutlinedInput
                      id="token-user-id-label"
                      label={t('token_index.transferToUser')}
                      type="number"
                      size="small"
                      value={values.user_id || ''}
                      name="user_id"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      inputProps={{ autoComplete: 'off' }}
                      aria-describedby="helper-text-token-user-id-label"
                    />
                    <FormHelperText id="helper-text-token-user-id-label">{t('token_index.transferToUserHelper')}</FormHelperText>
                  </FormControl>
                </>
              )}
              <Box sx={sectionSx}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <FormControl fullWidth error={Boolean(touched.name && errors.name)} sx={compactFieldSx}>
                      <InputLabel htmlFor="channel-name-label">{t('token_index.name')}</InputLabel>
                      <OutlinedInput
                        id="channel-name-label"
                        label={t('token_index.name')}
                        type="text"
                        size="small"
                        value={values.name}
                        name="name"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        inputProps={{ autoComplete: 'name' }}
                        aria-describedby="helper-text-channel-name-label"
                      />
                      {touched.name && errors.name && (
                        <FormHelperText error id="helper-tex-channel-name-label">
                          {errors.name}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      sx={{ m: 0, minHeight: 40 }}
                      control={
                        <Switch
                          size="small"
                          checked={values.expired_time === -1}
                          onClick={() => {
                            if (values.expired_time === -1) {
                              setFieldValue('expired_time', Math.floor(Date.now() / 1000));
                            } else {
                              setFieldValue('expired_time', -1);
                            }
                          }}
                        />
                      }
                      label={t('token_index.neverExpires')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      sx={{ m: 0, minHeight: 40 }}
                      control={
                        <Switch
                          size="small"
                          checked={values.unlimited_quota === true}
                          onClick={() => {
                            setFieldValue('unlimited_quota', !values.unlimited_quota);
                          }}
                        />
                      }
                      label={t('token_index.unlimitedQuota')}
                    />
                  </Grid>
                  {values.expired_time !== -1 && (
                    <Grid item xs={12}>
                      <FormControl fullWidth error={Boolean(touched.expired_time && errors.expired_time)} sx={compactFieldSx}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'zh-cn'}>
                          <DateTimePicker
                            label={t('token_index.expiryTime')}
                            ampm={false}
                            value={dayjs.unix(values.expired_time)}
                            onError={(newError) => {
                              if (newError === null) {
                                setFieldError('expired_time', null);
                              } else {
                                setFieldError('expired_time', t('token_index.invalidDate'));
                              }
                            }}
                            onChange={(newValue) => {
                              const newUnix = newValue.unix();
                              if (values.expired_time !== newUnix) {
                                setFieldValue('expired_time', newUnix);
                              }
                            }}
                            slotProps={{
                              textField: {
                                size: 'small'
                              },
                              actionBar: {
                                actions: ['today', 'accept']
                              }
                            }}
                          />
                        </LocalizationProvider>
                        {errors.expired_time && (
                          <FormHelperText error id="helper-tex-channel-expired_time-label">
                            {errors.expired_time}
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <FormControl fullWidth error={Boolean(touched.remain_quota && errors.remain_quota)} sx={compactFieldSx}>
                      <InputLabel htmlFor="channel-remain_quota-label">{t('token_index.quota')}</InputLabel>
                      <OutlinedInput
                        id="channel-remain_quota-label"
                        label={t('token_index.quota')}
                        type="text"
                        size="small"
                        value={values.remain_quota}
                        name="remain_quota"
                        startAdornment={<InputAdornment position="start">$</InputAdornment>}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        aria-describedby="helper-text-channel-remain_quota-label"
                        disabled={values.unlimited_quota}
                      />

                      {touched.remain_quota && errors.remain_quota && (
                        <FormHelperText error id="helper-tex-channel-remain_quota-label">
                          {errors.remain_quota}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                </Grid>
                <Alert severity="info" sx={{ mt: 1.5, py: 0 }}>
                  {t('token_index.quotaNote')}
                </Alert>
              </Box>

              <Box sx={sectionSx}>
                <Box sx={sectionHeaderSx}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('token_index.heartbeat')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('token_index.heartbeatTip')}
                  </Typography>
                </Box>

                <Grid container spacing={1.5} alignItems="flex-start">
                  <Grid item xs={12} sm={5}>
                    <FormControlLabel
                      sx={{ m: 0, minHeight: 40 }}
                      control={
                        <Switch
                          size="small"
                          checked={values?.setting?.heartbeat?.enabled === true}
                          onClick={() => {
                            setFieldValue('setting.heartbeat.enabled', !values.setting?.heartbeat?.enabled);
                          }}
                        />
                      }
                      label={t('token_index.heartbeat')}
                    />
                  </Grid>

                  {values?.setting?.heartbeat?.enabled && (
                    <Grid item xs={12} sm={7}>
                      <FormControl fullWidth size="small">
                        <InputLabel>{t('token_index.heartbeatTimeout')}</InputLabel>
                        <OutlinedInput
                          id="channel-heartbeat-timeout-label"
                          label={t('token_index.heartbeatTimeout')}
                          type="number"
                          size="small"
                          value={values?.setting?.heartbeat?.timeout_seconds}
                          onChange={(e) => {
                            setFieldValue('setting.heartbeat.timeout_seconds', e.target.value);
                          }}
                        />

                        {touched.setting?.heartbeat?.timeout_seconds && errors.setting?.heartbeat?.timeout_seconds ? (
                          <FormHelperText error id="helper-tex-channel-heartbeat-timeout-label">
                            {errors.setting?.heartbeat?.timeout_seconds}
                          </FormHelperText>
                        ) : (
                          <FormHelperText id="helper-tex-channel-heartbeat-timeout-label">
                            {t('token_index.heartbeatTimeoutHelperText')}
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Box sx={sectionSx}>
                <Box sx={sectionHeaderSx}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('token_index.selectGroup')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('token_index.selectGroupInfo')}
                  </Typography>
                </Box>

                {!adminMode && activeSubscriptionGroups.length > 0 && (
                  <Stack spacing={1.25} sx={{ mb: 1.5 }}>
                    <Alert severity={activeSubscriptionGroups.includes(values.group) ? 'success' : 'warning'}>
                      {activeSubscriptionGroups.includes(values.group)
                        ? t('token_index.subscriptionGroupMatched', { group: values.group })
                        : t('token_index.subscriptionGroupHint')}
                    </Alert>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {activeSubscriptionGroups.map((group) => (
                        <Typography
                          key={group}
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.4,
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: (theme) => theme.palette.primary.main,
                            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.12)' : 'rgba(25, 118, 210, 0.08)')
                          }}
                        >
                          {group}
                        </Typography>
                      ))}
                    </Box>
                  </Stack>
                )}

                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('token_index.userGroup')}</InputLabel>
                      <Select
                        size="small"
                        label={t('token_index.userGroup')}
                        name="group"
                        value={values.group || '-1'}
                        onChange={(e) => {
                          const value = e.target.value === '-1' ? '' : e.target.value;
                          setFieldValue('group', value);
                          if (value !== '') {
                            setFieldValue(
                              'backup_groups',
                              (values.backup_groups || []).filter((group) => group !== value)
                            );
                          }
                        }}
                        variant={'outlined'}
                      >
                        <MenuItem value="-1">跟随用户分组</MenuItem>
                        {sortedUserGroupOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                              <Typography variant="body2">{option.label}</Typography>
                              {activeSubscriptionGroups.includes(option.value) && (
                                <Typography
                                  component="span"
                                  sx={{
                                    px: 0.75,
                                    py: 0.2,
                                    borderRadius: '999px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: (theme) => theme.palette.primary.main,
                                    bgcolor: (theme) =>
                                      theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.12)' : 'rgba(25, 118, 210, 0.08)'
                                  }}
                                >
                                  {t('token_index.subscriptionGroupBadge')}
                                </Typography>
                              )}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const nextOption = userGroupOptions.find(
                          (option) => option.value !== values.group && !(values.backup_groups || []).includes(option.value)
                        );
                        if (!nextOption) {
                          return;
                        }
                        setFieldValue('backup_groups', [...(values.backup_groups || []), nextOption.value]);
                      }}
                      disabled={
                        !userGroupOptions.some(
                          (option) => option.value !== values.group && !(values.backup_groups || []).includes(option.value)
                        )
                      }
                      sx={{ height: 40 }}
                    >
                      {t('token_index.addBackupGroup')}
                    </Button>
                    <FormHelperText>{t('token_index.backupGroupInfo')}</FormHelperText>
                  </Grid>
                  {(values.backup_groups || []).map((backupGroup, index) => {
                    const availableOptions = userGroupOptions.filter(
                      (option) =>
                        option.value !== values.group &&
                        (option.value === backupGroup || !(values.backup_groups || []).includes(option.value))
                    );

                    return (
                      <Grid item xs={12} key={`backup-group-${index}`}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={8}>
                            <FormControl fullWidth>
                              <InputLabel>{`${t('token_index.userBackupGroup')} ${index + 1}`}</InputLabel>
                              <Select
                                size="small"
                                label={`${t('token_index.userBackupGroup')} ${index + 1}`}
                                value={backupGroup}
                                onChange={(e) => {
                                  const nextGroups = [...(values.backup_groups || [])];
                                  nextGroups[index] = e.target.value;
                                  setFieldValue('backup_groups', nextGroups);
                                }}
                                variant={'outlined'}
                              >
                                {availableOptions.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Button
                              fullWidth
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => {
                                setFieldValue(
                                  'backup_groups',
                                  (values.backup_groups || []).filter((_, groupIndex) => groupIndex !== index)
                                );
                              }}
                              sx={{ height: 40 }}
                            >
                              {t('token_index.removeBackupGroup')}
                            </Button>
                          </Grid>
                        </Grid>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>

              <Box sx={sectionSx}>
                <Box sx={sectionHeaderSx}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t('token_index.limits')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('token_index.limits_info')}
                  </Typography>
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      sx={{ m: 0, minHeight: 40 }}
                      control={
                        <Switch
                          size="small"
                          checked={values?.setting?.limits?.limit_model_setting?.enabled === true}
                          onClick={() => {
                            const newEnabledState = !values.setting?.limits?.limit_model_setting?.enabled;
                            setFieldValue('setting.limits.limit_model_setting.enabled', newEnabledState);
                            if (!newEnabledState) {
                              setFieldValue('setting.limits.limit_model_setting.models', []);
                            }
                          }}
                        />
                      }
                      label={t('token_index.limits_models_switch')}
                    />
                  </Grid>
                  {values?.setting?.limits?.limit_model_setting?.enabled && (
                    <Grid item xs={12}>
                      <ModelLimitSelector modelOptions={modelOptions} getModelIcon={getModelIcon} />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      {t('token_index.limits_ip_whitelist_info')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      sx={{ m: 0, minHeight: 40 }}
                      control={
                        <Switch
                          size="small"
                          checked={values?.setting?.limits?.limits_ip_setting?.enabled === true}
                          onClick={() => {
                            const newEnabledState = !values.setting?.limits?.limits_ip_setting?.enabled;
                            setFieldValue('setting.limits.limits_ip_setting.enabled', newEnabledState);
                            if (!newEnabledState) {
                              setFieldValue('setting.limits.limits_ip_setting.whitelist', []);
                            }
                          }}
                        />
                      }
                      label={t('token_index.limits_ip_whitelist_switch')}
                    />
                  </Grid>

                  {values?.setting?.limits?.limits_ip_setting?.enabled && (
                    <Grid item xs={12}>
                      <FormControl fullWidth sx={compactFieldSx}>
                        <TextField
                          size="small"
                          label={t('token_index.limits_ip_whitelist_input')}
                          multiline
                          rows={4}
                          value={values?.setting?.limits?.limits_ip_setting?.whitelist?.join('\n') || ''}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            setFieldValue('setting.limits.limits_ip_setting.whitelist', lines);
                          }}
                          placeholder="192.168.1.1&#10;10.0.0.0/8&#10;172.16.0.0/12"
                          helperText={t('token_index.limits_ip_whitelist_helper')}
                        />
                      </FormControl>
                    </Grid>
                  )}
                </Grid>
              </Box>
              <DialogActions sx={{ px: 0, pt: 0, pb: 0 }}>
                <Button onClick={onCancel}>{t('token_index.cancel')}</Button>
                <Button disableElevation disabled={isSubmitting} type="submit" variant="contained" color="primary">
                  {t('token_index.submit')}
                </Button>
              </DialogActions>
            </Box>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;

EditModal.propTypes = {
  open: PropTypes.bool,
  keyId: PropTypes.number,
  onCancel: PropTypes.func,
  onOk: PropTypes.func,
  userGroupOptions: PropTypes.array,
  adminMode: PropTypes.bool,
  presetGroup: PropTypes.string,
  presetPlanName: PropTypes.string
};
