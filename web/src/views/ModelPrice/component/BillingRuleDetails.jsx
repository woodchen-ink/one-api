import PropTypes from 'prop-types';
import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import Label from 'ui-component/Label';
import { extraRatiosConfig } from '../../Pricing/component/config';
import { hasBillingRules } from '../../Pricing/component/billingRules';

const matchFieldConfig = [
  { key: 'prompt_tokens_gt', labelKey: 'modelpricePage.promptTokens', defaultLabel: 'Prompt Tokens', operator: '>' },
  { key: 'prompt_tokens_gte', labelKey: 'modelpricePage.promptTokens', defaultLabel: 'Prompt Tokens', operator: '>=' },
  { key: 'prompt_tokens_lt', labelKey: 'modelpricePage.promptTokens', defaultLabel: 'Prompt Tokens', operator: '<' },
  { key: 'prompt_tokens_lte', labelKey: 'modelpricePage.promptTokens', defaultLabel: 'Prompt Tokens', operator: '<=' },
  { key: 'request_tokens_gt', labelKey: 'modelpricePage.requestTokens', defaultLabel: 'Request Tokens', operator: '>' },
  { key: 'request_tokens_gte', labelKey: 'modelpricePage.requestTokens', defaultLabel: 'Request Tokens', operator: '>=' },
  { key: 'request_tokens_lt', labelKey: 'modelpricePage.requestTokens', defaultLabel: 'Request Tokens', operator: '<' },
  { key: 'request_tokens_lte', labelKey: 'modelpricePage.requestTokens', defaultLabel: 'Request Tokens', operator: '<=' }
];

export const getExtraRatioDisplayName = (key) => extraRatiosConfig.find((item) => item.key === key)?.name || key;

const formatMultiplier = (value) => {
  if (value === undefined || value === null) {
    return '-';
  }

  const numericValue = Number(value);
  return `x${Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(4).replace(/\.?0+$/, '')}`;
};

const getMatchLabels = (rule, t) =>
  matchFieldConfig.reduce((result, field) => {
    const value = rule?.match?.[field.key];
    if (value === undefined || value === null || value === '') {
      return result;
    }

    result.push(`${t(field.labelKey, field.defaultLabel)} ${field.operator} ${Number(value).toLocaleString()}`);
    return result;
  }, []);

const getAdjustmentLabels = ({ rule, priceType, groupRatio, formatPrice, t }) => {
  const strategy = rule?.strategy || 'override';
  const labels = [];
  const effectiveRatio = groupRatio || 1;
  const inputLabel = priceType === 'times' ? t('modelpricePage.timesPrice', '单次价格') : t('modelpricePage.input', '输入');

  if (rule?.input !== undefined && rule?.input !== null) {
    labels.push({
      label: inputLabel,
      value: strategy === 'multiply' ? formatMultiplier(rule.input) : formatPrice(rule.input * effectiveRatio, priceType),
      color: priceType === 'times' ? 'primary' : 'success'
    });
  }

  if (rule?.output !== undefined && rule?.output !== null) {
    labels.push({
      label: t('modelpricePage.output', '输出'),
      value: strategy === 'multiply' ? formatMultiplier(rule.output) : formatPrice(rule.output * effectiveRatio, priceType),
      color: 'warning'
    });
  }

  Object.entries(rule?.extra_ratios || {}).forEach(([key, value]) => {
    labels.push({
      label: getExtraRatioDisplayName(key),
      value: strategy === 'multiply' ? formatMultiplier(value) : formatPrice(value * effectiveRatio, 'tokens'),
      color: 'default'
    });
  });

  return labels;
};

export default function BillingRuleDetails({ rules, priceType, groupRatio, formatPrice, compact = false }) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (!hasBillingRules(rules)) {
    return (
      <Typography variant="body2" color="text.secondary">
        -
      </Typography>
    );
  }

  return (
    <Stack spacing={compact ? 1 : 1.5}>
      {rules.map((rule, index) => {
        const matchLabels = getMatchLabels(rule, t);
        const adjustmentLabels = getAdjustmentLabels({ rule, priceType, groupRatio, formatPrice, t });
        const strategyLabel =
          rule?.strategy === 'multiply' ? t('modelpricePage.billingMultiply', '倍率调整') : t('modelpricePage.billingOverride', '覆盖价格');

        return (
          <Box
            key={`${rule?.name || 'rule'}-${index}`}
            sx={{
              p: compact ? 1.25 : 1.5,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.18 : 0.9)}`,
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.48)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`
                  : `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.grey[50], 0.96)} 100%)`
            }}
          >
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Label color="info" variant="soft">
                {rule?.name || `${t('modelpricePage.billingRule', '规则')} ${index + 1}`}
              </Label>
              <Label color={rule?.strategy === 'multiply' ? 'warning' : 'primary'} variant="outlined">
                {strategyLabel}
              </Label>
              {rule?.priority !== undefined && rule?.priority !== null && (
                <Typography variant="caption" color="text.secondary">
                  {t('modelpricePage.priority', '优先级')} {rule.priority}
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: adjustmentLabels.length > 0 ? 1 : 0 }}>
              {matchLabels.length > 0 ? (
                matchLabels.map((item) => (
                  <Box
                    key={item}
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 999,
                      border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                      backgroundColor: alpha(theme.palette.info.main, 0.08)
                    }}
                  >
                    <Typography variant="caption" color="info.main" sx={{ fontWeight: 600 }}>
                      {item}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {t('modelpricePage.noBillingCondition', '未配置匹配条件')}
                </Typography>
              )}
            </Stack>

            {adjustmentLabels.length > 0 && (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {adjustmentLabels.map((item) => (
                  <Label key={`${item.label}-${item.value}`} color={item.color} variant="soft" sx={{ maxWidth: compact ? 220 : 'none' }}>
                    {`${item.label}: ${item.value}`}
                  </Label>
                ))}
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

BillingRuleDetails.propTypes = {
  compact: PropTypes.bool,
  formatPrice: PropTypes.func.isRequired,
  groupRatio: PropTypes.number,
  priceType: PropTypes.string,
  rules: PropTypes.array
};
