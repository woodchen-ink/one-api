import PropTypes from 'prop-types';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Icon } from '@iconify/react';

import { ExtraRatiosSelector } from './ExtraRatiosSelector';
import { billingRuleStrategyOptions, createEmptyBillingRule, summarizeBillingRule } from './billingRules';

export default function BillingRulesEditor({
  value = [],
  onChange,
  priceStartAdornment,
  currentChannelType = null,
  ownedby = []
}) {
  const theme = useTheme();

  const updateRule = (index, updater) => {
    const nextRules = value.map((rule, ruleIndex) => {
      if (ruleIndex !== index) {
        return rule;
      }

      return updater(rule);
    });
    onChange(nextRules);
  };

  const handleAddRule = () => {
    onChange([...(value || []), createEmptyBillingRule()]);
  };

  const handleRemoveRule = (index) => {
    onChange(value.filter((_, ruleIndex) => ruleIndex !== index));
  };

  const handleFieldChange = (index, field, fieldValue) => {
    updateRule(index, (rule) => ({
      ...rule,
      [field]: fieldValue
    }));
  };

  const handleMatchChange = (index, field, fieldValue) => {
    updateRule(index, (rule) => ({
      ...rule,
      match: {
        ...(rule.match || {}),
        [field]: fieldValue
      }
    }));
  };

  const handleExtraRatiosChange = (index, extraRatios) => {
    updateRule(index, (rule) => ({
      ...rule,
      extra_ratios: extraRatios
    }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="body1" fontWeight={600}>
            分档计费规则
          </Typography>
          <Typography variant="caption" color="text.secondary">
            支持按 Prompt / Request token 阈值切换价格或叠加倍率
          </Typography>
        </Box>
        <Button startIcon={<Icon icon="ic:baseline-add" />} variant="outlined" size="small" onClick={handleAddRule}>
          添加规则
        </Button>
      </Stack>

      {value.length === 0 ? (
        <Box
          sx={{
            p: 2,
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: 1,
            color: 'text.secondary'
          }}
        >
          <Typography variant="body2">未配置分档规则，当前模型将始终使用基础价格。</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {value.map((rule, index) => {
            const strategy = rule?.strategy || 'override';
            const helperText =
              strategy === 'multiply'
                ? '倍率模式下填写倍数，例如 2 表示 x2，1.5 表示 x1.5'
                : '覆盖模式下填写实际价格，单位为 USD / 1M tokens';

            return (
              <Box
                key={`${rule?.name || 'rule'}-${index}`}
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  borderRadius: 2,
                  p: 2,
                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.5) : theme.palette.background.paper
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2">规则 #{index + 1}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {summarizeBillingRule(rule) || '请设置匹配条件'}
                    </Typography>
                  </Box>
                  <Button color="error" size="small" startIcon={<Icon icon="mdi:delete" />} onClick={() => handleRemoveRule(index)}>
                    删除
                  </Button>
                </Stack>

                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="规则名称"
                      value={rule?.name || ''}
                      onChange={(event) => handleFieldChange(index, 'name', event.target.value)}
                    />
                    <TextField
                      label="优先级"
                      type="number"
                      value={rule?.priority ?? 100}
                      onChange={(event) => handleFieldChange(index, 'priority', event.target.value)}
                      sx={{ minWidth: { xs: '100%', sm: 160 } }}
                    />
                    <FormControl sx={{ minWidth: { xs: '100%', sm: 180 } }}>
                      <InputLabel>规则类型</InputLabel>
                      <Select
                        label="规则类型"
                        value={strategy}
                        onChange={(event) => handleFieldChange(index, 'strategy', event.target.value)}
                      >
                        {billingRuleStrategyOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  <Divider />

                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      匹配条件
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, minmax(0, 1fr))'
                        },
                        gap: 2
                      }}
                    >
                      <TextField
                        fullWidth
                        label="Prompt >"
                        type="number"
                        value={rule?.match?.prompt_tokens_gt ?? ''}
                        onChange={(event) => handleMatchChange(index, 'prompt_tokens_gt', event.target.value)}
                      />
                      <TextField
                        fullWidth
                        label="Prompt <="
                        type="number"
                        value={rule?.match?.prompt_tokens_lte ?? ''}
                        onChange={(event) => handleMatchChange(index, 'prompt_tokens_lte', event.target.value)}
                      />
                      <TextField
                        fullWidth
                        label="Request >"
                        type="number"
                        value={rule?.match?.request_tokens_gt ?? ''}
                        onChange={(event) => handleMatchChange(index, 'request_tokens_gt', event.target.value)}
                      />
                      <TextField
                        fullWidth
                        label="Request <="
                        type="number"
                        value={rule?.match?.request_tokens_lte ?? ''}
                        onChange={(event) => handleMatchChange(index, 'request_tokens_lte', event.target.value)}
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      价格调整
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      {helperText}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel>输入</InputLabel>
                        <OutlinedInput
                          label="输入"
                          type="number"
                          value={rule?.input ?? ''}
                          onChange={(event) => handleFieldChange(index, 'input', event.target.value)}
                          startAdornment={
                            <InputAdornment position="start">
                              {strategy === 'multiply' ? 'x' : priceStartAdornment?.() || 'USD / 1M:'}
                            </InputAdornment>
                          }
                        />
                      </FormControl>
                      <FormControl fullWidth>
                        <InputLabel>输出</InputLabel>
                        <OutlinedInput
                          label="输出"
                          type="number"
                          value={rule?.output ?? ''}
                          onChange={(event) => handleFieldChange(index, 'output', event.target.value)}
                          startAdornment={
                            <InputAdornment position="start">
                              {strategy === 'multiply' ? 'x' : priceStartAdornment?.() || 'USD / 1M:'}
                            </InputAdornment>
                          }
                        />
                      </FormControl>
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      扩展价格调整
                    </Typography>
                    <ExtraRatiosSelector
                      value={rule?.extra_ratios || {}}
                      onChange={(next) => handleExtraRatiosChange(index, next)}
                      currentChannelType={currentChannelType}
                      ownedby={ownedby}
                    />
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

BillingRulesEditor.propTypes = {
  value: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  priceStartAdornment: PropTypes.func,
  currentChannelType: PropTypes.number,
  ownedby: PropTypes.array
};
