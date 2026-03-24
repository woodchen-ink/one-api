import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Icon } from '@iconify/react';

import { API } from 'utils/api';
import { showError, showSuccess } from 'utils/common';
import { extraRatiosConfig } from './config';

function getExtraRatioLabel(key) {
  return extraRatiosConfig.find((item) => item.key === key)?.name || key;
}

function buildRowFromPreview(row) {
  return {
    source_model: row.source_model || '',
    model: row.model || '',
    channel_type: row.channel_type || 0,
    type: row.type || 'tokens',
    input: row.input ?? 0,
    output: row.output ?? 0,
    extra_ratios: { ...(row.extra_ratios || {}) },
    billing_rules: Array.isArray(row.billing_rules) ? row.billing_rules : []
  };
}

export default function PriceSyncDialog({ open, onClose, onApplied, fallbackModelOptions = [] }) {
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState('');
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadProviders = async () => {
      setLoadingProviders(true);
      try {
        const res = await API.get('/api/prices/sync/providers');
        const { success, message, data } = res.data;
        if (!success) {
          showError(message);
          return;
        }

        setProviders(data || []);
        if ((data || []).length > 0) {
          setProvider((current) => current || data[0].key);
        }
      } catch (error) {
        showError(error.message);
      } finally {
        setLoadingProviders(false);
      }
    };

    loadProviders();
  }, [open]);

  const currentProvider = useMemo(() => providers.find((item) => item.key === provider) || null, [providers, provider]);

  const modelOptions = useMemo(() => {
    const previewOptions = preview?.model_options || [];
    const combined = new Set([...previewOptions, ...fallbackModelOptions]);
    return Array.from(combined).sort();
  }, [preview, fallbackModelOptions]);

  const extraKeys = useMemo(() => {
    const keySet = new Set();
    rows.forEach((row) => {
      Object.keys(row.extra_ratios || {}).forEach((key) => keySet.add(key));
    });
    return Array.from(keySet);
  }, [rows]);

  const resetState = () => {
    setPreview(null);
    setRows([]);
    setPreviewLoading(false);
    setApplyLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleLoadPreview = async () => {
    if (!provider) {
      showError('请先选择渠道');
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await API.post('/api/prices/sync/preview', { provider });
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }

      setPreview(data);
      setRows((data?.rows || []).map(buildRowFromPreview));
    } catch (error) {
      showError(error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const updateRow = (index, updater) => {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }
        return updater(row);
      })
    );
  };

  const handleDeleteRow = (index) => {
    setRows((currentRows) => currentRows.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleApply = async () => {
    if (rows.length === 0) {
      showError('没有可应用的价格行');
      return;
    }

    const normalizedRows = rows.map((row, index) => {
      const model = String(row.model || '').trim();
      if (!model) {
        throw new Error(`第 ${index + 1} 行未选择目标模型`);
      }

      const normalizedExtraRatios = {};
      Object.entries(row.extra_ratios || {}).forEach(([key, value]) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
          throw new Error(`第 ${index + 1} 行扩展价格 ${getExtraRatioLabel(key)} 无效`);
        }
        normalizedExtraRatios[key] = numericValue;
      });

      return {
        source_model: row.source_model,
        model,
        channel_type: row.channel_type,
        type: row.type,
        input: Number(row.input),
        output: Number(row.output),
        extra_ratios: normalizedExtraRatios,
        billing_rules: Array.isArray(row.billing_rules) ? row.billing_rules : []
      };
    });

    setApplyLoading(true);
    try {
      const res = await API.post('/api/prices/sync/apply', {
        provider,
        rows: normalizedRows
      });
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }

      showSuccess('价格更新成功');
      handleClose();
      onApplied?.();
    } catch (error) {
      showError(error.message);
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl">
      <DialogTitle>更新价格</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            先从官方文档抓取价格草案，再由管理员确认后写入系统。目标模型支持从现有模型列表中选择，也支持手动输入。若官方价格包含分档计费规则，系统会一并导入。
          </Alert>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>渠道</InputLabel>
              <Select
                label="渠道"
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value);
                  setPreview(null);
                  setRows([]);
                }}
                disabled={loadingProviders || previewLoading || applyLoading}
              >
                {providers.map((item) => (
                  <MenuItem key={item.key} value={item.key}>
                    {item.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleLoadPreview}
              disabled={!provider || previewLoading || applyLoading || loadingProviders}
              startIcon={previewLoading ? <CircularProgress size={16} color="inherit" /> : <Icon icon="solar:refresh-bold-duotone" />}
            >
              抓取官方价格
            </Button>

            {currentProvider?.source_url && (
              <Link
                href={currentProvider.source_url}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ alignSelf: 'center' }}
              >
                查看官方来源
              </Link>
            )}
          </Stack>

          {preview && (
            <Alert severity="success">
              已抓取 {rows.length} 行价格草案。
              {preview.provider?.name ? ` 当前渠道：${preview.provider.name}。` : ''}
              请确认目标模型和价格后再提交。
            </Alert>
          )}

          {preview && rows.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 560 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 200 }}>官方名称</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>目标模型</TableCell>
                    <TableCell sx={{ minWidth: 110 }}>输入价</TableCell>
                    <TableCell sx={{ minWidth: 110 }}>输出价</TableCell>
                    {extraKeys.map((key) => (
                      <TableCell key={key} sx={{ minWidth: 150 }}>
                        {getExtraRatioLabel(key)}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ minWidth: 80 }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={`${row.source_model}-${index}`} hover>
                      <TableCell>{row.source_model}</TableCell>
                      <TableCell>
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={modelOptions}
                          value={row.model}
                          onChange={(_, value) => {
                            updateRow(index, (currentRow) => ({
                              ...currentRow,
                              model: value || ''
                            }));
                          }}
                          onInputChange={(_, value, reason) => {
                            if (reason === 'input') {
                              updateRow(index, (currentRow) => ({
                                ...currentRow,
                                model: value
                              }));
                            }
                          }}
                          renderInput={(params) => <TextField {...params} placeholder="选择或输入模型名" />}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={row.input}
                          onChange={(event) =>
                            updateRow(index, (currentRow) => ({
                              ...currentRow,
                              input: event.target.value
                            }))
                          }
                          inputProps={{ min: 0, step: '0.01' }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={row.output}
                          onChange={(event) =>
                            updateRow(index, (currentRow) => ({
                              ...currentRow,
                              output: event.target.value
                            }))
                          }
                          inputProps={{ min: 0, step: '0.01' }}
                        />
                      </TableCell>
                      {extraKeys.map((key) => (
                        <TableCell key={key}>
                          <TextField
                            size="small"
                            type="number"
                            value={row.extra_ratios?.[key] ?? ''}
                            onChange={(event) =>
                              updateRow(index, (currentRow) => ({
                                ...currentRow,
                                extra_ratios: {
                                  ...(currentRow.extra_ratios || {}),
                                  [key]: event.target.value
                                }
                              }))
                            }
                            inputProps={{ min: 0, step: '0.01' }}
                          />
                        </TableCell>
                      ))}
                      <TableCell align="right">
                        <IconButton color="error" onClick={() => handleDeleteRow(index)} size="small">
                          <Icon icon="mdi:delete-outline" width={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {preview && rows.length === 0 && <Alert severity="warning">当前草案为空，请重新抓取或检查官方文档格式。</Alert>}

          {preview && modelOptions.length === 0 && (
            <Alert severity="warning">系统里暂时没有该渠道的现有模型选项，你仍然可以手动输入目标模型名。</Alert>
          )}

          {preview && (
            <Typography variant="caption" color="text.secondary">
              价格单位均为 USD / 1M tokens。删除某行表示本次不同步该行，不会自动删除系统中已有价格。
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={applyLoading}>
          取消
        </Button>
        <Button onClick={handleApply} variant="contained" disabled={!preview || rows.length === 0 || applyLoading}>
          {applyLoading ? '提交中...' : '确认更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

PriceSyncDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onApplied: PropTypes.func,
  fallbackModelOptions: PropTypes.array
};
