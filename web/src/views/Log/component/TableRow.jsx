import PropTypes from 'prop-types';
import { useMemo, memo } from 'react';
import { ArrowForward } from '@mui/icons-material';
import { Icon } from '@iconify/react';

import Badge from '@mui/material/Badge';

import { Box, TableRow, TableCell, Stack, Tooltip, Typography } from '@mui/material';

import { timestamp2string, renderQuota } from 'utils/common';
import Label from 'ui-component/Label';
import { useLogType } from '../type/LogType';
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';

function renderType(type, logTypes, t) {
  const typeOption = logTypes[type];
  if (typeOption) {
    return (
      <Label variant="filled" color={typeOption.color}>
        {' '}
        {typeOption.text}{' '}
      </Label>
    );
  } else {
    return (
      <Label variant="filled" color="error">
        {' '}
        {t('logPage.unknown')}{' '}
      </Label>
    );
  }
}

function requestTimeLabelOptions(request_time) {
  let color = 'error';
  if (request_time === 0) {
    color = 'default';
  } else if (request_time <= 10) {
    color = 'success';
  } else if (request_time <= 50) {
    color = 'primary';
  } else if (request_time <= 100) {
    color = 'secondary';
  }

  return color;
}

function LogTableRow({ item, userIsAdmin, userGroup, columnVisibility }) {
  const { t } = useTranslation();
  const LogType = useLogType();
  let request_time = item.request_time / 1000;
  let request_time_str = request_time.toFixed(2) + ' S';

  const { totalInputTokens, totalOutputTokens, tokenDetails, cacheCost } = useMemo(() => calculateTokens(item), [item]);

  return (
    <>
      <TableRow tabIndex={item.id}>
        {columnVisibility.created_at && <TableCell sx={{ p: '10px 8px' }}>{timestamp2string(item.created_at)}</TableCell>}

        {userIsAdmin && columnVisibility.channel_id && (
          <TableCell sx={{ p: '10px 8px' }}>
            {(item.channel_id || '') + ' ' + (item.channel?.name ? '(' + item.channel.name + ')' : '')}
          </TableCell>
        )}
        {userIsAdmin && columnVisibility.user_id && (
          <TableCell sx={{ p: '10px 8px' }}>
            <Label color="default" variant="outlined" copyText={item.username}>
              {item.username}
            </Label>
          </TableCell>
        )}

        {columnVisibility.group && (
          <TableCell sx={{ p: '10px 8px' }}>
            {item?.metadata?.is_backup_group ? (
              // 显示分组重定向：原始分组 → 备份分组
              <Stack direction="row" spacing={1} alignItems="center">
                <Label color="default" variant="soft">
                  {userGroup[item.metadata.group_name]?.name || '跟随用户'}
                </Label>
                <ArrowForward sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Label color="warning" variant="soft">
                  {userGroup[item.metadata.backup_group_name]?.name || '备份分组'}
                </Label>
              </Stack>
            ) : // 正常显示分组
            item?.metadata?.group_name || item?.metadata?.backup_group_name ? (
              <Label color="default" variant="soft">
                {userGroup[item.metadata.group_name || item.metadata.backup_group_name]?.name || '跟随用户'}
              </Label>
            ) : (
              ''
            )}
          </TableCell>
        )}
        {columnVisibility.token_name && (
          <TableCell sx={{ p: '10px 8px' }}>
            {item.token_name && (
              <Label color="default" variant="soft" copyText={item.token_name}>
                {item.token_name}
              </Label>
            )}
          </TableCell>
        )}
        {columnVisibility.type && <TableCell sx={{ p: '10px 8px' }}>{renderType(item.type, LogType, t)}</TableCell>}
        {columnVisibility.model_name && <TableCell sx={{ p: '10px 8px' }}>{viewModelName(item.model_name, item.is_stream)}</TableCell>}
        {columnVisibility.reasoning && <TableCell sx={{ p: '10px 8px' }}>{viewReasoning(item?.metadata?.reasoning, t)}</TableCell>}

        {columnVisibility.request_path && (
          <TableCell sx={{ p: '10px 8px' }}>
            {item?.metadata?.request_path && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {item.metadata.request_path}
              </Typography>
            )}
          </TableCell>
        )}
        {columnVisibility.duration && (
          <TableCell sx={{ p: '10px 8px' }}>
            <Label color={requestTimeLabelOptions(request_time)}>{item.request_time === 0 ? '-' : request_time_str}</Label>
          </TableCell>
        )}
        {columnVisibility.tokens && (
          <TableCell sx={{ p: '10px 8px', whiteSpace: 'nowrap', textAlign: 'center' }}>
            {viewTokens(item, t, totalInputTokens, totalOutputTokens, tokenDetails)}
          </TableCell>
        )}
        {columnVisibility.quota && <TableCell sx={{ p: '10px 8px' }}>{viewQuota(item, t, cacheCost)}</TableCell>}
        {columnVisibility.source_ip && <TableCell sx={{ p: '10px 8px' }}>{item.source_ip || ''}</TableCell>}
      </TableRow>
    </>
  );
}

LogTableRow.propTypes = {
  item: PropTypes.object,
  userIsAdmin: PropTypes.bool,
  userGroup: PropTypes.object,
  columnVisibility: PropTypes.object
};

// 使用 React.memo 优化组件渲染性能
export default memo(LogTableRow, (prevProps, nextProps) => {
  // 自定义比较函数，只有相关数据变化时才重新渲染
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.userIsAdmin === nextProps.userIsAdmin &&
    JSON.stringify(prevProps.columnVisibility) === JSON.stringify(nextProps.columnVisibility) &&
    JSON.stringify(prevProps.userGroup) === JSON.stringify(nextProps.userGroup)
  );
});

function viewModelName(model_name, isStream) {
  if (!model_name) {
    return '';
  }

  if (isStream) {
    return (
      <Badge
        badgeContent="Stream"
        color="primary"
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.55rem',
            height: '16px',
            minWidth: '16px',
            padding: '0 4px',
            top: '-3px'
          }
        }}
      >
        <Label color="primary" variant="outlined" copyText={model_name}>
          {model_name}
        </Label>
      </Badge>
    );
  }

  return (
    <Label color="primary" variant="outlined" copyText={model_name}>
      {model_name}
    </Label>
  );
}

function viewReasoning(reasoning, t) {
  if (!reasoning?.enabled) {
    return (
      <Typography variant="body2" color="text.secondary">
        -
      </Typography>
    );
  }

  const label = reasoning.level ? (
    <Label color={getReasoningColor(reasoning.level)} variant="soft">
      {reasoning.level}
    </Label>
  ) : (
    <Typography variant="body2" color="text.secondary">
      -
    </Typography>
  );

  const details = getReasoningDetails(reasoning, t);
  if (details.length === 0) {
    return label;
  }

  return (
    <Tooltip
      title={
        <>
          {details.map(({ key, label, value }) => (
            <MetadataTypography key={key}>{`${label}: ${value}`}</MetadataTypography>
          ))}
        </>
      }
      placement="top"
      arrow
    >
      <span style={{ cursor: 'help' }}>{label}</span>
    </Tooltip>
  );
}

function getReasoningColor(level) {
  switch ((level || '').toLowerCase()) {
    case 'low':
      return 'success';
    case 'medium':
      return 'primary';
    case 'high':
      return 'warning';
    case 'xhigh':
      return 'error';
    default:
      return 'default';
  }
}

function getReasoningDetails(reasoning, t) {
  const details = [];

  if (reasoning.provider_family) {
    details.push({
      key: 'provider_family',
      label: t('logPage.reasoningDetail.provider'),
      value: reasoning.provider_family
    });
  }

  if (reasoning.mode) {
    details.push({
      key: 'mode',
      label: t('logPage.reasoningDetail.mode'),
      value: reasoning.mode
    });
  }

  if (reasoning.raw_effort) {
    details.push({
      key: 'raw_effort',
      label: t('logPage.reasoningDetail.rawEffort'),
      value: reasoning.raw_effort
    });
  }

  if (reasoning.raw_thinking_level) {
    details.push({
      key: 'raw_thinking_level',
      label: t('logPage.reasoningDetail.rawThinkingLevel'),
      value: reasoning.raw_thinking_level
    });
  }

  if (reasoning.budget_tokens) {
    details.push({
      key: 'budget_tokens',
      label: t('logPage.reasoningDetail.budgetTokens'),
      value: reasoning.budget_tokens
    });
  }

  if (reasoning.summary) {
    details.push({
      key: 'summary',
      label: t('logPage.reasoningDetail.summary'),
      value: reasoning.summary
    });
  }

  if (reasoning.requested_via) {
    details.push({
      key: 'requested_via',
      label: t('logPage.reasoningDetail.requestedVia'),
      value: reasoning.requested_via
    });
  }

  return details;
}

const MetadataTypography = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.grey[300],
  '&:not(:last-child)': {
    marginBottom: theme.spacing(0.5)
  }
}));

function viewTokens(item, t, totalInputTokens, totalOutputTokens, tokenDetails) {
  const { prompt_tokens, completion_tokens } = item;
  const detailMetrics = (tokenDetails || [])
    .filter((detail) => ['cached_tokens', 'cached_write_tokens', 'cached_read_tokens', 'reasoning_tokens'].includes(detail.key))
    .map((detail) => ({
      ...detail,
      shortLabel: getTokenShortLabel(detail.key)
    }));

  if (!prompt_tokens && !completion_tokens) return '';

  const content = (
    <Box
      sx={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(2, 75px)',
        gap: 0.5
      }}
    >
      <TokenMetric icon="material-symbols:input-rounded" color="info.main" value={prompt_tokens || 0} />
      <TokenMetric icon="material-symbols:output-rounded" color="success.main" value={completion_tokens || 0} />
    </Box>
  );

  const contentWithDetails = (
    <Stack spacing={0.5} alignItems="flex-start">
      {content}
      {detailMetrics.length > 0 && (
        <Box
          sx={{
            display: 'inline-grid',
            gridTemplateColumns: 'repeat(2, 75px)',
            gap: 0.5
          }}
        >
          {detailMetrics.map((metric) => (
            <TokenMetric key={metric.key} icon={getMetricIcon(metric.key)} value={metric.value} />
          ))}
        </Box>
      )}
    </Stack>
  );

  return (
    <Tooltip
      title={
        <>
          <MetadataTypography>{`${t('logPage.totalInputTokens')}: ${totalInputTokens}`}</MetadataTypography>
          <MetadataTypography>{`${t('logPage.totalOutputTokens')}: ${totalOutputTokens}`}</MetadataTypography>
          {detailMetrics.map((metric) => (
            <MetadataTypography key={metric.key}>{`${metric.shortLabel}: ${metric.value}`}</MetadataTypography>
          ))}
        </>
      }
      placement="top"
      arrow
    >
      <span style={{ cursor: 'help', display: 'inline-block', textAlign: 'left' }}>{contentWithDetails}</span>
    </Tooltip>
  );
}

function viewQuota(item, t, cacheCost = 0) {
  const displayValue = item.quota ? renderQuota(item.quota, 6) : '$0';
  const metadata = item?.metadata;
  const hasBillingInfo =
    metadata?.billing_context ||
    (Array.isArray(metadata?.billing_rules) && metadata.billing_rules.length > 0) ||
    (Array.isArray(metadata?.billing_breakdown) && metadata.billing_breakdown.length > 0);

  const content = <Typography variant="body2">{displayValue}</Typography>;

  if (!hasBillingInfo) {
    return content;
  }

  const tooltipContent = (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>
        成本明细{' '}
      </Typography>

      {(metadata?.billing_breakdown || []).map((detail, index) => (
        <Stack key={`billing-breakdown-${index}`} direction="row" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Icon icon={getMetricIcon(detail.metric)} width={14} />
            <Typography variant="caption" sx={{ color: '#d1d5db' }}>
              {`${formatBillingMetricLabel(detail.metric)} ${detail.quantity || 0} x $${formatUSD(detail.unit_price || 0)} / 1M`}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
            ${formatUSD(detail.cost_usd || 0)}
          </Typography>
        </Stack>
      ))}

      {/* {(metadata?.input_price != null || metadata?.output_price != null) && (
        <Stack spacing={0.5}>
          <MetadataTypography>{`输入单价 $${formatUSD(metadata.input_price || 0)} / 1M Token`}</MetadataTypography>
          <MetadataTypography>{`输出单价 $${formatUSD(metadata.output_price || 0)} / 1M Token`}</MetadataTypography>
        </Stack>
      )}

      {(metadata?.billing_breakdown || []).filter((detail) => !['input', 'output', 'request'].includes(detail.metric)).length > 0 && (
        <Stack spacing={0.5}>
          {(metadata?.billing_breakdown || [])
            .filter((detail) => !['input', 'output', 'request'].includes(detail.metric))
            .filter((detail, index, arr) => arr.findIndex((item) => item.metric === detail.metric) === index)
            .map((detail) => (
              <MetadataTypography key={`unit-price-${detail.metric}`}>
                {`${formatBillingMetricLabel(detail.metric)} 单价 $${formatUSD(detail.unit_price || 0)} / 1M Token`}
              </MetadataTypography>
            ))}
        </Stack>
      )} */}

      {/* {metadata?.billing_context && (
        <MetadataTypography>{`Prompt=${metadata.billing_context.prompt_tokens || 0} / Request=${metadata.billing_context.request_tokens || 0}`}</MetadataTypography>
      )} */}

      {(metadata?.billing_rules || []).map((rule, index) => {
        const summary = summarizeRule(rule);
        return (
          <MetadataTypography
            key={`billing-rule-${index}`}
          >{`${rule.name || `rule-${index + 1}`}${summary ? ` | ${summary}` : ''}`}</MetadataTypography>
        );
      })}

      <Box sx={{ height: 1, bgcolor: 'rgba(255,255,255,0.12)' }} />
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: '#d1d5db' }}>
          计费{' '}
        </Typography>
        <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 700 }}>
          {displayValue}
        </Typography>
      </Stack>
    </Stack>
  );

  return (
    <Tooltip title={tooltipContent} placement="top" arrow>
      <span style={{ cursor: 'help' }}>{content}</span>
    </Tooltip>
  );
}

function formatUSD(value) {
  if (value == null) {
    return '0';
  }

  const formatted = value >= 1 ? value.toFixed(4) : value.toFixed(6);
  return formatted.replace(/(\.\d*?[1-9])0+$|\.0*$/, '$1');
}

function summarizeRule(rule) {
  if (!rule?.match) {
    return '';
  }

  const parts = [];
  const appendPart = (label, op, value) => {
    if (value == null || value === '') {
      return;
    }
    parts.push(`${label} ${op} ${value}`);
  };

  appendPart('prompt', '>', rule.match.prompt_tokens_gt);
  appendPart('prompt', '<=', rule.match.prompt_tokens_lte);
  appendPart('request', '>', rule.match.request_tokens_gt);
  appendPart('request', '<=', rule.match.request_tokens_lte);

  return parts.join(', ');
}

function formatBillingMetricLabel(metric) {
  const metricMap = {
    input: 'Input',
    output: 'Output',
    cached_tokens: 'Cached Tokens',
    cached_write_tokens: 'Cached Write Tokens',
    cached_read_tokens: 'Cached Read Tokens',
    input_audio_tokens: 'Input Audio Tokens',
    output_audio_tokens: 'Output Audio Tokens',
    reasoning_tokens: 'Reasoning Tokens',
    input_text_tokens: 'Input Text Tokens',
    output_text_tokens: 'Output Text Tokens',
    input_image_tokens: 'Input Image Tokens',
    output_image_tokens: 'Output Image Tokens',
    request: 'Request'
  };

  return metricMap[metric] || metric;
}

function legacyRateToPricePerMillion(rate) {
  if (rate == null) {
    return null;
  }

  return rate * 2;
}

function getLegacyBasePrice(metadata, isInput) {
  const directKey = isInput ? 'input_price' : 'output_price';
  if (metadata?.[directKey] != null) {
    return metadata[directKey];
  }

  const legacyKey = isInput ? 'input_ratio' : 'output_ratio';
  return legacyRateToPricePerMillion(metadata?.[legacyKey]);
}

function getExtraTokenPrice(metadata, key, isInput) {
  const directPrice = metadata?.[`${key}_price`];
  if (directPrice != null) {
    return directPrice;
  }

  const legacyRatio = metadata?.[`${key}_ratio`];
  const basePrice = getLegacyBasePrice(metadata, isInput);
  if (legacyRatio != null && basePrice != null) {
    return legacyRatio * basePrice;
  }

  return null;
}

function calculateTokens(item) {
  const { prompt_tokens, completion_tokens, metadata } = item;

  if (!metadata) {
    return {
      totalInputTokens: prompt_tokens || 0,
      totalOutputTokens: completion_tokens || 0,
      show: false,
      tokenDetails: [],
      cacheMetrics: [],
      cacheCost: 0
    };
  }

  if (Array.isArray(metadata.billing_breakdown) && metadata.billing_breakdown.length > 0) {
    const tokenDetails = metadata.billing_breakdown
      .filter((detail) => detail?.type === 'tokens')
      .map((detail) => ({
        key: detail.metric,
        label: formatBillingMetricLabel(detail.metric),
        value: detail.quantity || 0,
        unitPrice: detail.unit_price || 0,
        cost: detail.cost_usd || 0
      }));
    const cacheMetrics = tokenDetails
      .filter((detail) => ['cached_tokens', 'cached_write_tokens', 'cached_read_tokens'].includes(detail.key))
      .map((detail) => ({
        ...detail,
        shortLabel: getTokenShortLabel(detail.key)
      }));
    const cacheCost = cacheMetrics.reduce((sum, detail) => sum + (detail.cost || 0), 0);

    return {
      totalInputTokens: metadata?.billing_context?.prompt_tokens ?? prompt_tokens ?? 0,
      totalOutputTokens: completion_tokens || 0,
      show: tokenDetails.length > 0,
      tokenDetails,
      cacheMetrics,
      cacheCost
    };
  }

  const totalInputTokens = prompt_tokens;
  const totalOutputTokens = completion_tokens;

  const tokenDetails = [
    { key: 'input_text_tokens', label: 'Input Text Tokens', isInput: true },
    { key: 'output_text_tokens', label: 'Output Text Tokens', isInput: false },
    { key: 'input_audio_tokens', label: 'Input Audio Tokens', isInput: true },
    { key: 'output_audio_tokens', label: 'Output Audio Tokens', isInput: false },
    { key: 'cached_tokens', label: 'Cached Tokens', isInput: true },
    { key: 'cached_write_tokens', label: 'Cached Write Tokens', isInput: true },
    { key: 'cached_read_tokens', label: 'Cached Read Tokens', isInput: true },
    { key: 'reasoning_tokens', label: 'Reasoning Tokens', isInput: false },
    { key: 'input_image_tokens', label: 'Input Image Tokens', isInput: true },
    { key: 'output_image_tokens', label: 'Output Image Tokens', isInput: false }
  ]
    .filter(({ key }) => metadata[key] > 0)
    .map(({ key, label, isInput }) => {
      const value = metadata[key];
      const unitPrice = getExtraTokenPrice(metadata, key, isInput);
      if (unitPrice == null) {
        return null;
      }

      return {
        key,
        label,
        value,
        unitPrice,
        cost: (value * unitPrice) / 1000000
      };
    })
    .filter(Boolean);
  const cacheMetrics = tokenDetails
    .filter((detail) => ['cached_tokens', 'cached_write_tokens', 'cached_read_tokens'].includes(detail.key))
    .map((detail) => ({
      ...detail,
        shortLabel: getTokenShortLabel(detail.key)
      }));
  const cacheCost = cacheMetrics.reduce((sum, detail) => sum + (detail.cost || 0), 0);

  return {
    totalInputTokens,
    totalOutputTokens,
    show: tokenDetails.length > 0,
    tokenDetails,
    cacheMetrics,
    cacheCost
  };
}

function getTokenShortLabel(key) {
  const labels = {
    cached_tokens: 'Cache',
    cached_write_tokens: 'Cache Write',
    cached_read_tokens: 'Cache Read',
    reasoning_tokens: 'Reasoning'
  };

  return labels[key] || key;
}

function getMetricIcon(key) {
  const icons = {
    input: 'material-symbols:input-rounded',
    output: 'material-symbols:output-rounded',
    cached_tokens: 'mdi:database-outline',
    cached_write_tokens: 'mdi:database-arrow-up-outline',
    cached_read_tokens: 'mdi:database-arrow-down-outline',
    input_audio_tokens: 'mdi:waveform',
    output_audio_tokens: 'mdi:waveform',
    reasoning_tokens: 'mdi:head-lightbulb-outline',
    input_text_tokens: 'mdi:text-box-outline',
    output_text_tokens: 'mdi:text-box-outline',
    input_image_tokens: 'mdi:image-outline',
    output_image_tokens: 'mdi:image-outline',
    request: 'mdi:cash-register'
  };

  return icons[key] || 'mdi:circle-outline';
}

function TokenMetric({ icon, color, value }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.45,
        borderRadius: 0.6,
        bgcolor: 'action.hover'
      }}
    >
      <Icon icon={icon} width={14} />
      <Typography variant="caption" color={color} sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}

TokenMetric.propTypes = {
  icon: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired
};
