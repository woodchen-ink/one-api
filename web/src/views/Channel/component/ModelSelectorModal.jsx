import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { API } from 'utils/api';
import { showError, showSuccess } from 'utils/common';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Divider,
  FormControl,
  InputLabel,
  OutlinedInput,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  FormHelperText,
  Typography,
  InputAdornment,
  FormControlLabel,
  Switch,
  Collapse,
  Chip,
  Paper,
  Skeleton,
  Tooltip,
  Alert,
  Grid,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LoadingButton from '@mui/lab/LoadingButton';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';

const ModelSelectorModal = ({ open, onClose, onConfirm, channelValues, prices }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenAIMode, setIsOpenAIMode] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [modelGroups, setModelGroups] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [error, setError] = useState('');
  const ownedby = useSelector((state) => state.siteInfo?.ownedby);
  const [addToMapping, setAddToMapping] = useState(false);
  const [removePrefixOrSuffix, setRemovePrefixOrSuffix] = useState(true);
  const [prefixOrSuffix, setPrefixOrSuffix] = useState('');
  const [addPlusSign, setAddPlusSign] = useState(false);
  const [convertToLowercase, setConvertToLowercase] = useState(false);
  const [filterMappedModels, setFilterMappedModels] = useState(false);
  const [overwriteMappings, setOverwriteMappings] = useState(false);
  const [mappingPreview, setMappingPreview] = useState({});

  const getOwnedbyName = (id) => {
    const owner = ownedby.find((item) => item.id === id);
    return owner?.name;
  };

  const getChannelTypeByModel = (model) => {
    const price = prices.find((item) => item.model === model);
    return price?.channel_type;
  };

  useEffect(() => {
    if (open) {
      if (channelValues?.models) {
        try {
          const modelsList = channelValues.models.map(({ id }) => ({
            id,
            group: t('channel_edit.existingModels')
          }));
          setSelectedModels(modelsList);
        } catch (e) {
          console.error('Error parsing existing models', e);
          setSelectedModels([]);
        }
      } else {
        setSelectedModels([]);
      }

      if (channelValues?.base_url) {
        setCustomBaseUrl(channelValues.base_url);
      }

      setAddToMapping(false);
      setRemovePrefixOrSuffix(true);
      setPrefixOrSuffix('');
      setAddPlusSign(false);
      setConvertToLowercase(false);
      setFilterMappedModels(false);
      setOverwriteMappings(false);
      setMappingPreview({});
    }
  }, [open, channelValues, t]);

  useEffect(() => {
    if (!addToMapping || selectedModels.length === 0) {
      setMappingPreview({});
      return;
    }

    const preview = {};
    selectedModels.forEach((model) => {
      const originalId = model.id;
      let key = originalId;
      let value = originalId;

      if (prefixOrSuffix) {
        if (removePrefixOrSuffix) {
          if (key.startsWith(prefixOrSuffix)) {
            key = key.substring(prefixOrSuffix.length);
          }
        } else {
          if (key.endsWith(prefixOrSuffix)) {
            key = key.substring(0, key.length - prefixOrSuffix.length);
          }
        }
      }

      if (key.includes('/')) {
        key = key.split('/').pop();
      }

      if (convertToLowercase) {
        key = key.toLowerCase();
      }

      if (addPlusSign) {
        value = `+${value}`;
      }

      if (key !== value) {
        preview[key] = value;
      }
    });

    setMappingPreview(preview);
  }, [selectedModels, addToMapping, removePrefixOrSuffix, prefixOrSuffix, addPlusSign, convertToLowercase]);

  const handleOpenAIModeChange = (event) => {
    const isChecked = event.target.checked;
    setIsOpenAIMode(isChecked);

    if (isChecked && !customBaseUrl && channelValues?.base_url) {
      setCustomBaseUrl(channelValues.base_url);
    }
  };

  const fetchModels = async () => {
    setLoading(true);
    setError('');
    try {
      const requestData = {
        ...channelValues,
        models: '',
        model_mapping: '',
        model_headers: ''
      };

      if (isOpenAIMode) {
        requestData.type = 1;
        if (customBaseUrl) {
          requestData.base_url = customBaseUrl;
        }
      }

      const res = await API.post(`/api/channel/provider_models_list`, requestData);
      const { success, message, data } = res.data;

      if (success && data) {
        const groupedModels = {};
        const uniqueModels = Array.from(new Set(data)).map((model) => {
          let group = t('channel_edit.otherModels');

          const channelType = getChannelTypeByModel(model);

          if (channelType) {
            const modelGroup = getOwnedbyName(channelType);
            if (modelGroup) {
              group = modelGroup;
            }
          } else if (model.includes('/')) {
            const modelGroup = model.split('/')[0];
            group = modelGroup;
          }

          return { id: model, group };
        });

        uniqueModels.forEach((model) => {
          if (!groupedModels[model.group]) {
            groupedModels[model.group] = [];
          }
          groupedModels[model.group].push(model);
        });

        setModels(uniqueModels);
        setModelGroups(groupedModels);

        const defaultExpanded = {};
        Object.keys(groupedModels).forEach((group) => {
          defaultExpanded[group] = true;
        });
        setExpandedGroups(defaultExpanded);

        showSuccess(t('channel_edit.modelsFetched'));
      } else {
        setError(message || t('channel_edit.modelListError'));
        showError(message || t('channel_edit.modelListError'));
      }
    } catch (error) {
      setError(error.message);
      showError(error.message);
    }
    setLoading(false);
  };

  const handleModelToggle = (model) => {
    const currentIndex = selectedModels.findIndex((m) => m.id === model.id);
    const newSelectedModels = [...selectedModels];

    if (currentIndex === -1) {
      newSelectedModels.push(model);
    } else {
      newSelectedModels.splice(currentIndex, 1);
    }

    setSelectedModels(newSelectedModels);
  };

  const toggleGroupExpand = (group) => {
    setExpandedGroups({
      ...expandedGroups,
      [group]: !expandedGroups[group]
    });
  };

  const handleSelectGroup = (group) => {
    const groupModels = modelGroups[group] || [];
    const allSelected = groupModels.every((model) => selectedModels.some((m) => m.id === model.id));

    if (allSelected) {
      setSelectedModels(selectedModels.filter((model) => !groupModels.some((m) => m.id === model.id)));
    } else {
      const modelsToAdd = groupModels.filter((model) => !selectedModels.some((m) => m.id === model.id));
      setSelectedModels([...selectedModels, ...modelsToAdd]);
    }
  };

  const handleSelectAll = () => {
    if (filteredModels.length === selectedModels.length) {
      const filteredIds = new Set(filteredModels.map((model) => model.id));
      setSelectedModels(selectedModels.filter((model) => !filteredIds.has(model.id)));
    } else {
      const existingIds = new Set(selectedModels.map((model) => model.id));
      const newModels = filteredModels.filter((model) => !existingIds.has(model.id));
      setSelectedModels([...selectedModels, ...newModels]);
    }
  };

  const handleInvertSelection = () => {
    const newSelectedModels = [...selectedModels];

    filteredModels.forEach((model) => {
      const index = newSelectedModels.findIndex((m) => m.id === model.id);
      if (index === -1) {
        newSelectedModels.push(model);
      } else {
        newSelectedModels.splice(index, 1);
      }
    });

    setSelectedModels(newSelectedModels);
  };

  const filteredModels = models.filter((model) => model.id.toLowerCase().includes(searchTerm.toLowerCase()));

  const getFilteredModelsByGroup = () => {
    const result = {};

    if (filteredModels.length === 0) return result;

    filteredModels.forEach((model) => {
      if (!result[model.group]) {
        result[model.group] = [];
      }
      result[model.group].push(model);
    });

    return result;
  };

  const filteredModelsByGroup = getFilteredModelsByGroup();

  const handleConfirm = () => {
    const mappings = addToMapping
      ? Object.entries(mappingPreview).map(([key, value], index) => ({
          index,
          key,
          value
        }))
      : [];

    let modelsToSubmit = [...selectedModels];

    if (addToMapping && mappings.length > 0) {
      if (filterMappedModels) {
        const mappedValues = mappings.map((m) => (m.value.startsWith('+') ? m.value.substring(1) : m.value));
        modelsToSubmit = selectedModels.filter((model) => !mappedValues.includes(model.id));
        const mappedValues = mappings.map((m) => (m.value.startsWith('+') ? m.value.substring(1) : m.value));
        modelsToSubmit = selectedModels.filter((model) => !mappedValues.includes(model.id));
      }

      const mappedModels = mappings.map((mapping) => {
      const mappedModels = mappings.map((mapping) => {
        return { id: mapping.key, group: t('channel_edit.customModelTip') };
      });

      const existingIds = new Set(modelsToSubmit.map((model) => model.id));
      const newMappedModels = mappedModels.filter((model) => !existingIds.has(model.id));
      const existingIds = new Set(modelsToSubmit.map((model) => model.id));
      const newMappedModels = mappedModels.filter((model) => !existingIds.has(model.id));

      modelsToSubmit = [...modelsToSubmit, ...newMappedModels];
    }

    onConfirm(modelsToSubmit, mappings, overwriteMappings);
    onClose();
  };

  const handleClose = () => {
    setModels([]);
    setSelectedModels([]);
    setSearchTerm('');
    setError('');
    setAddToMapping(false);
    setPrefixOrSuffix('');
    setAddPlusSign(false);
    setConvertToLowercase(false);
    setFilterMappedModels(false);
    setOverwriteMappings(false);
    setMappingPreview({});
    onClose();
  };

  const getSelectedCountInGroup = (group) => {
    const groupModels = modelGroups[group] || [];
    return groupModels.filter((model) => selectedModels.some((m) => m.id === model.id)).length;
  };

  const renderGroupHeader = (group) => {
    const groupModels = modelGroups[group] || [];
    const selectedCount = getSelectedCountInGroup(group);
    const allSelected = selectedCount === groupModels.length && groupModels.length > 0;
    const someSelected = selectedCount > 0 && selectedCount < groupModels.length;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderRadius: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' }
        }}
        onClick={() => toggleGroupExpand(group)}
      >
        <Checkbox
          edge="start"
          checked={allSelected}
          indeterminate={someSelected}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectGroup(group);
          }}
          disabled={groupModels.length === 0}
        />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {group}
        </Typography>
        <Chip
          size="small"
          label={`${selectedCount}/${groupModels.length}`}
          color={selectedCount > 0 ? 'primary' : 'default'}
          sx={{ mr: 1 }}
        />
        <IconButton size="small">
          <Icon icon={expandedGroups[group] ? 'mdi:chevron-up' : 'mdi:chevron-down'} />
        </IconButton>
      </Box>
    );
  };

  const handleRemoveSelected = (modelId) => {
    setSelectedModels(selectedModels.filter((m) => m.id !== modelId));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle
        sx={{
          margin: 0,
          fontWeight: 700,
          lineHeight: '1.5',
          padding: { xs: '12px 16px', sm: '16px 24px' },
          fontSize: { xs: '1rem', sm: '1.125rem' },
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Icon icon="mdi:robot" style={{ marginRight: 8 }} />
        {t('channel_edit.modelSelector')}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={handleClose} size="small">
          <Icon icon="mdi:close" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 1.5, sm: 2, md: 3 },
          minHeight: 0,
          overflow: 'hidden',
          height: { xs: 'auto', md: '70vh' },
          maxHeight: '80vh'
        }}
      >
        <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', height: '100%' }}>
          {/* Left Column: Fetch + Search + Model List */}
          <Grid
            item
            xs={12}
            md={7}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: { xs: isMobile ? '50vh' : 'auto', md: '100%' },
              minHeight: 0,
              overflow: 'hidden',
              flexGrow: 1
            }}
          >
            {/* Fetch Settings */}
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2,
                borderRadius: 1,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                flexShrink: 0
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={<Switch checked={isOpenAIMode} onChange={handleOpenAIModeChange} color="primary" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Icon icon="simple-icons:openai" style={{ marginRight: 8 }} />
                        {t('channel_edit.openaiMode')}
                      </Box>
                    }
                    sx={{ m: 0 }}
                  />
                  <LoadingButton
                    variant="contained"
                    loading={loading}
                    onClick={fetchModels}
                    startIcon={<Icon icon="mdi:cloud-download" />}
                    sx={{ height: '40px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {t('channel_edit.fetchModels')}
                  </LoadingButton>
                </Box>

                {isOpenAIMode && (
                  <FormControl fullWidth>
                    <InputLabel htmlFor="openai-base-url">{t('channel_edit.baseUrl')}</InputLabel>
                    <OutlinedInput
                      id="openai-base-url"
                      label={t('channel_edit.baseUrl')}
                      value={customBaseUrl}
                      onChange={(e) => setCustomBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com"
                      size="small"
                      endAdornment={
                        customBaseUrl && (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setCustomBaseUrl('')} edge="end">
                              <Icon icon="mdi:close" />
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    />
                    <FormHelperText>{t('channel_edit.openaiBaseUrlTip')}</FormHelperText>
                  </FormControl>
                )}
              </Box>
            </Paper>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2, flexShrink: 0 }}
                action={
                  <IconButton color="inherit" size="small" onClick={() => setError('')}>
                    <Icon icon="mdi:close" />
                  </IconButton>
                }
              >
                {error}
              </Alert>
            )}

            {/* Search + Actions */}
            <Box sx={{ mb: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'stretch', gap: 1, flexShrink: 0 }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                label={t('channel_edit.searchModels')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon icon="mdi:magnify" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                        <Icon icon="mdi:close" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ flex: '1 1 auto' }}
              />

              <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
                <Tooltip title={t('channel_edit.selectAllTooltip')}>
                  <span>
                    <Button
                      onClick={handleSelectAll}
                      startIcon={<Icon icon="mdi:select-all" />}
                      variant="outlined"
                      size="small"
                      disabled={loading || models.length === 0}
                      sx={{ whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}
                    >
                      {t('channel_edit.selectAll')}
                    </Button>
                  </span>
                </Tooltip>

                <Tooltip title={t('channel_edit.invertSelectionTooltip')}>
                  <span>
                    <Button
                      onClick={handleInvertSelection}
                      startIcon={<Icon icon="mdi:swap-horizontal" />}
                      variant="outlined"
                      size="small"
                      disabled={loading || models.length === 0}
                      sx={{ whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}
                    >
                      {t('channel_edit.invertSelection')}
                    </Button>
                  </span>
                </Tooltip>

                <Tooltip title={t('channel_edit.clearModelsTip')} placement="top">
                  <span>
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedModels([])}
                      startIcon={<Icon icon="mdi:refresh" />}
                      disabled={selectedModels.length === 0}
                      size="small"
                      sx={{ whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}
                    >
                      {t('common.reset')}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            {/* Model List */}
            <Paper
              variant="outlined"
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 1,
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              {loading ? (
                <Box sx={{ p: 2 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Skeleton variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
                      <Box sx={{ pl: 2 }}>
                        {[1, 2, 3].map((j) => (
                          <Skeleton key={j} variant="rectangular" height={30} sx={{ mb: 0.5, borderRadius: 1 }} />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : models.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    p: 4
                  }}
                >
                  <Icon icon="mdi:robot-confused" style={{ fontSize: 64, opacity: 0.5, marginBottom: 16 }} />
                  <Typography variant="h6" color="text.secondary">
                    {t('channel_edit.noModels')}
                  </Typography>
                </Box>
              ) : filteredModels.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    p: 4
                  }}
                >
                  <Icon icon="mdi:file-search-outline" style={{ fontSize: 64, opacity: 0.5, marginBottom: 16 }} />
                  <Typography variant="h6" color="text.secondary">
                    {t('channel_edit.noMatchingModels')}
                  </Typography>
                  <Button variant="text" startIcon={<Icon icon="mdi:close" />} onClick={() => setSearchTerm('')} sx={{ mt: 2 }}>
                    {t('channel_edit.clearSearch')}
                  </Button>
                </Box>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    p: 1.5,
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {Object.entries(filteredModelsByGroup).map(([group, groupModels]) => (
                    <Box key={group} sx={{ mb: 1.5 }}>
                      {renderGroupHeader(group)}
                      <Collapse in={expandedGroups[group]} timeout="auto">
                        <List dense disablePadding sx={{ pl: 2 }}>
                          {groupModels.map((model) => {
                            const isSelected = selectedModels.some((m) => m.id === model.id);
                            return (
                              <ListItem
                                key={model.id}
                                dense
                                button
                                onClick={() => handleModelToggle(model)}
                                sx={{
                                  borderRadius: 1,
                                  mb: 0.5,
                                  transition: 'all 0.2s',
                                  py: 0.5,
                                  '&:hover': {
                                    bgcolor: (theme) =>
                                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                                  },
                                  ...(isSelected && {
                                    bgcolor: (theme) =>
                                      theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.15)' : 'rgba(33,150,243,0.08)'
                                  })
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 42 }}>
                                  <Checkbox edge="start" checked={isSelected} tabIndex={-1} disableRipple color="primary" size="small" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={model.id}
                                  primaryTypographyProps={{
                                    sx: {
                                      fontFamily: 'monospace',
                                      fontSize: '0.875rem',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      ...(isSelected && { fontWeight: 600 })
                                    }
                                  }}
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </Collapse>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Right Column: Selected Models + Mapping Config */}
          <Grid
            item
            xs={12}
            md={5}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 'auto', md: '100%' },
              overflow: 'hidden'
            }}
          >
            {/* Selected Models */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1,
                mb: 2,
                flexShrink: 0,
                maxHeight: { md: '40%' },
                overflow: 'auto'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Icon icon="mdi:check-circle" style={{ marginRight: 8, opacity: 0.7 }} />
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                  {t('channel_edit.selectedCount', { count: selectedModels.length })}
                </Typography>
                {selectedModels.length > 0 && (
                  <Button size="small" onClick={() => setSelectedModels([])} startIcon={<Icon icon="mdi:delete-sweep" />}>
                    {t('common.reset')}
                  </Button>
                )}
              </Box>
              {selectedModels.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  {t('channel_edit.noModels')}
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedModels.map((model) => (
                    <Chip
                      key={model.id}
                      label={model.id}
                      size="small"
                      onDelete={() => handleRemoveSelected(model.id)}
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        height: 'auto',
                        '& .MuiChip-label': {
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          padding: '4px 8px',
                          lineHeight: 1.4
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Paper>

            {/* Mapping Config */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1,
                flexGrow: 1,
                overflow: 'auto',
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)')
              }}
            >
              <FormControlLabel
                control={<Switch checked={addToMapping} onChange={(e) => setAddToMapping(e.target.checked)} color="primary" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Icon icon="mdi:map-marker-path" style={{ marginRight: 8 }} />
                    {t('channel_edit.addToModelMapping')}
                  </Box>
                }
                sx={{ m: 0, mb: 1 }}
              />

              <Collapse in={addToMapping}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('channel_edit.modelMappingSettings')}
                  </Typography>

                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>{t('channel_edit.prefixOrSuffix')}</InputLabel>
                    <OutlinedInput
                      value={prefixOrSuffix}
                      onChange={(e) => setPrefixOrSuffix(e.target.value)}
                      label={t('channel_edit.prefixOrSuffix')}
                      placeholder={removePrefixOrSuffix ? 'openai/' : ':free'}
                      endAdornment={
                        prefixOrSuffix && (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setPrefixOrSuffix('')} edge="end">
                              <Icon icon="mdi:close" />
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    />
                    <FormHelperText>
                      {removePrefixOrSuffix ? t('channel_edit.removePrefixHelp') : t('channel_edit.removeSuffixHelp')}
                    </FormHelperText>
                  </FormControl>

                  <FormControlLabel
                    control={<Switch checked={removePrefixOrSuffix} onChange={(e) => setRemovePrefixOrSuffix(e.target.checked)} />}
                    label={t(removePrefixOrSuffix ? 'channel_edit.removePrefix' : 'channel_edit.removeSuffix')}
                    sx={{ my: 0 }}
                  />

                  <FormControlLabel
                    control={<Switch checked={addPlusSign} onChange={(e) => setAddPlusSign(e.target.checked)} />}
                    label={t('channel_edit.addPlusSign')}
                    sx={{ my: 0 }}
                  />

                  <FormControlLabel
                    control={<Switch checked={convertToLowercase} onChange={(e) => setConvertToLowercase(e.target.checked)} />}
                    label={t('channel_edit.convertToLowercase')}
                    sx={{ my: 0 }}
                  />

                  <FormControlLabel
                    control={<Switch checked={filterMappedModels} onChange={(e) => setFilterMappedModels(e.target.checked)} />}
                    label={t('channel_edit.filterMappedModels')}
                    sx={{ my: 0 }}
                  />


                  <FormControlLabel
                    control={<Switch checked={overwriteMappings} onChange={(e) => setOverwriteMappings(e.target.checked)} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {t('channel_edit.overwriteMappings')}
                        <Tooltip title={t('channel_edit.overwriteMappingsTip')} placement="top" arrow>
                          <Icon icon="mdi:help-circle-outline" style={{ marginLeft: 4, opacity: 0.7 }} />
                        </Tooltip>
                      </Box>
                    }
                    sx={{ my: 0 }}
                  />

                  {Object.keys(mappingPreview).length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('channel_edit.mappingPreview')} ({Object.keys(mappingPreview).length})
                      </Typography>
                      <Box
                        sx={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1,
                          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)')
                        }}
                      >
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {JSON.stringify(mappingPreview, null, 2)}
                        </pre>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon="mdi:information-outline" style={{ marginRight: 4, opacity: 0.7 }} />
          {addToMapping
            ? t('channel_edit.selectedMappingCount', {
                count: selectedModels.length,
                mappingCount: Object.keys(mappingPreview).length
              })
            : t('channel_edit.selectedCount', { count: selectedModels.length })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleClose} startIcon={<Icon icon="mdi:close" />} variant="outlined">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={selectedModels.length === 0}
            startIcon={<Icon icon={addToMapping ? 'mdi:map-marker-path' : 'mdi:check'} />}
          >
            {addToMapping ? t('channel_edit.addMapping') : t('common.submit')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

ModelSelectorModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  channelValues: PropTypes.object,
  prices: PropTypes.array
};

export default ModelSelectorModal;
