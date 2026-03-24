import PropTypes from 'prop-types';
import { useMemo, memo } from 'react';
import { ArrowForward } from '@mui/icons-material';
import { Icon } from '@iconify/react';

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

function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds <= 0) {
    return '-';
  }

  return `${(milliseconds / 1000).toFixed(2)} S`;
}

function getDurationValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

function renderIpLink(ip) {
  if (!ip) {
    return '';
  }

  return (
    <a href={`https://ip.czl.net/${ip}`} target="_blank" rel="noopener noreferrer">
      {ip}
    </a>
  );
}

function viewCompactText(value, width = 220, typographyProps = {}) {
  if (!value) {
    return '';
  }

  return (
    <Tooltip title={value} placement="top" arrow>
      <Typography
        variant="body2"
        sx={{
          maxWidth: width,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...typographyProps.sx
        }}
      >
        {value}
      </Typography>
    </Tooltip>
  );
}

function LogTableRow({ item, userIsAdmin, userGroup, columnVisibility }) {
  const { t } = useTranslation();
  const LogType = useLogType();

  const { totalInputTokens, totalOutputTokens, tokenDetails } = useMemo(() => calculateTokens(item), [item]);

  return (
    <>
      <TableRow tabIndex={item.id}>
        {columnVisibility.created_at && (
          <TableCell sx={{ p: '10px 8px', whiteSpace: 'nowrap' }}>{timestamp2string(item.created_at)}</TableCell>
        )}

        {userIsAdmin && columnVisibility.channel_id && (
          <TableCell sx={{ p: '10px 8px', minWidth: 160 }}>
            {(item.channel_id || '') + ' ' + (item.channel?.name ? '(' + item.channel.name + ')' : '')}
          </TableCell>
        )}
        {userIsAdmin && columnVisibility.user_id && (
          <TableCell sx={{ p: '10px 8px', minWidth: 120 }}>
            <Label color="default" variant="outlined" copyText={item.username}>
              {item.username}
            </Label>
          </TableCell>
        )}

        {columnVisibility.group && (
          <TableCell sx={{ p: '10px 8px', minWidth: 140 }}>
            {item?.metadata?.is_backup_group ? (
              // 显示分组重定向：原始分组 → 备份分组
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
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
          <TableCell sx={{ p: '10px 8px', minWidth: 140 }}>
            {item.token_name && (
              <Label color="default" variant="soft" copyText={item.token_name}>
                {item.token_name}
              </Label>
            )}
          </TableCell>
        )}
        {columnVisibility.type && <TableCell sx={{ p: '10px 8px', minWidth: 110 }}>{renderType(item.type, LogType, t)}</TableCell>}
        {columnVisibility.model_name && (
          <TableCell sx={{ p: '10px 8px', minWidth: 150 }}>{viewModelName(item.model_name, item.is_stream, item.metadata, t)}</TableCell>
        )}
        {columnVisibility.reasoning && (
          <TableCell sx={{ p: '10px 8px', minWidth: 110 }}>{viewReasoning(item?.metadata?.reasoning, t)}</TableCell>
        )}

        {columnVisibility.request_path && (
          <TableCell sx={{ p: '10px 8px', minWidth: 160, maxWidth: 200 }}>
            {viewCompactText(item?.metadata?.request_path, 180, {
              sx: {
                fontFamily: 'monospace',
                color: 'text.secondary'
              }
            })}
          </TableCell>
        )}
        {columnVisibility.duration && (
          <TableCell sx={{ p: '10px 8px', minWidth: 150, whiteSpace: 'nowrap', textAlign: 'center' }}>{viewDuration(item, t)}</TableCell>
        )}
        {columnVisibility.tokens && (
          <TableCell sx={{ p: '10px 8px', minWidth: 160, whiteSpace: 'nowrap', textAlign: 'center' }}>
            {viewTokens(item, t, totalInputTokens, totalOutputTokens, tokenDetails)}
          </TableCell>
        )}
        {columnVisibility.quota && <TableCell sx={{ p: '10px 8px', minWidth: 100 }}>{viewQuota(item, t)}</TableCell>}
        {columnVisibility.source_ip && (
          <TableCell sx={{ p: '10px 8px', minWidth: 140, whiteSpace: 'nowrap' }}>{renderIpLink(item.source_ip)}</TableCell>
        )}
        {userIsAdmin && columnVisibility.user_agent && (
          <TableCell sx={{ p: '10px 8px', minWidth: 220, maxWidth: 260 }}>{viewCompactText(item?.metadata?.user_agent, 240)}</TableCell>
        )}
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

function viewModelName(model_name, isStream, metadata, t) {
  if (!model_name) {
    return '';
  }

  const requestMode = metadata?.request_mode;
  const requestTransport = metadata?.request_transport;
  let modeLabel = '';
  let modeIcon = '';

  if (isStream) {
    modeLabel = t('logPage.requestMode.stream');
    modeIcon = 'material-symbols:arrow-right-alt-rounded';
  } else if (requestMode === 'responses_ws') {
    modeLabel = t('logPage.requestMode.responsesWss');
    modeIcon = 'material-symbols:compare-arrows-rounded';
  } else if (requestMode === 'realtime_ws') {
    modeLabel = t('logPage.requestMode.realtimeWss');
    modeIcon = 'material-symbols:compare-arrows-rounded';
  } else if (requestTransport === 'wss') {
    modeLabel = t('logPage.requestMode.wss');
    modeIcon = 'material-symbols:compare-arrows-rounded';
  }

  if (modeLabel) {
    return (
      <Tooltip title={modeLabel} placement="top" arrow>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <Label color="primary" variant="outlined" copyText={model_name}>
            {model_name}
          </Label>
          <Box
            sx={{
              position: 'absolute',
              top: -5,
              right: -7,
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              boxShadow: (theme) => theme.shadows[1]
            }}
          >
            <Icon icon={modeIcon} width={12} />
          </Box>
        </Box>
      </Tooltip>
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

function getStatusTextColor(color) {
  switch (color) {
    case 'success':
      return 'success.main';
    case 'primary':
      return 'primary.main';
    case 'secondary':
      return 'secondary.main';
    case 'error':
      return 'error.main';
    default:
      return 'text.secondary';
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

const detailTooltipSlotProps = {
  popper: {
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 10]
        }
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 16,
          altAxis: true,
          tether: true
        }
      },
      {
        name: 'flip',
        options: {
          padding: 16
        }
      }
    ]
  },
  tooltip: {
    sx: {
      maxWidth: 'min(360px, calc(100vw - 32px))',
      maxHeight: 'min(60vh, 420px)',
      overflowY: 'auto',
      overflowX: 'hidden',
      p: 1.5,
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      '&::-webkit-scrollbar': {
        width: 6
      }
    }
  }
};

function viewTokens(item, t, totalInputTokens, totalOutputTokens, tokenDetails) {
  const { prompt_tokens, completion_tokens } = item;
  const detailMetrics = (tokenDetails || [])
    .filter((detail) =>
      [
        'cached_tokens',
        'cached_write_tokens',
        'cached_write_5m_tokens',
        'cached_write_1h_tokens',
        'cached_read_tokens',
        'reasoning_tokens',
        'input_audio_tokens',
        'output_audio_tokens',
        'input_image_tokens',
        'output_image_tokens'
      ].includes(detail.key)
    )
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

function viewDuration(item, t) {
  const totalDuration = getDurationValue(item?.request_time);
  const firstResponseDuration = getDurationValue(item?.metadata?.first_response);
  const content = (
    <Box
      sx={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(2, 75px)',
        gap: 0.5
      }}
    >
      <DurationMetric
        icon="mdi:flash-outline"
        value={formatDuration(firstResponseDuration)}
        color={requestTimeLabelOptions(firstResponseDuration / 1000)}
      />
      <DurationMetric
        icon="mdi:timer-sand-complete"
        value={formatDuration(totalDuration)}
        color={requestTimeLabelOptions(totalDuration / 1000)}
      />
    </Box>
  );

  return (
    <Tooltip
      title={
        <>
          <MetadataTypography>{`${t('logPage.firstDurationLabel')}: ${formatDuration(firstResponseDuration)}`}</MetadataTypography>
          <MetadataTypography>{`${t('logPage.totalDurationLabel')}: ${formatDuration(totalDuration)}`}</MetadataTypography>
        </>
      }
      placement="top"
      arrow
    >
      <span style={{ cursor: 'help', display: 'inline-block' }}>{content}</span>
    </Tooltip>
  );
}

function viewQuota(item, t) {
  const displayValue = item.quota ? renderQuota(item.quota, 6) : '$0';
  const metadata = item?.metadata;
  const billingBreakdown = metadata?.billing_breakdown || [];
  const billingRules = metadata?.billing_rules || [];
  const rawUserRatio = Number(metadata?.user_ratio);
  const rawGroupRatio = Number(metadata?.group_ratio);
  const userRatio = Number.isFinite(rawUserRatio) && rawUserRatio > 0 ? rawUserRatio : null;
  const groupRatio = Number.isFinite(rawGroupRatio) && rawGroupRatio > 0 ? rawGroupRatio : null;
  const originalBilling = billingBreakdown.reduce((sum, detail) => sum + Number(detail?.cost_usd || 0), 0);
  const hasBillingInfo = metadata?.billing_context || billingRules.length > 0 || billingBreakdown.length > 0;

  const content = <Typography variant="body2">{displayValue}</Typography>;

  if (!hasBillingInfo) {
    return content;
  }

  const tooltipContent = (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ color: 'common.white', fontWeight: 700 }}>
        成本明细{' '}
      </Typography>

      {billingBreakdown.map((detail, index) => (
        <Box
          key={`billing-breakdown-${index}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 1,
            alignItems: 'start'
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
            <Icon icon={getMetricIcon(detail.metric)} width={14} />
            <Typography
              variant="caption"
              sx={{
                color: 'grey.300',
                minWidth: 0,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}
            >
              {`${formatBillingMetricLabel(detail.metric)} ${detail.quantity || 0} x $${formatUSD(detail.unit_price || 0)} / 1M`}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'common.white', fontWeight: 600, whiteSpace: 'nowrap' }}>
            ${formatUSD(detail.cost_usd || 0)}
          </Typography>
        </Box>
      ))}

      {(userRatio != null || groupRatio != null || billingBreakdown.length > 0) && (
        <Stack spacing={0.5}>
          {userRatio != null && (
            <MetadataTypography>{`${t('logPage.quotaDetail.userRatio')}: x${formatRatio(userRatio)}`}</MetadataTypography>
          )}
          {groupRatio != null && (
            <MetadataTypography>{`${t('logPage.quotaDetail.groupRatio')}: x${formatRatio(groupRatio)}`}</MetadataTypography>
          )}
          {billingBreakdown.length > 0 && (
            <MetadataTypography>{`${t('logPage.quotaDetail.originalBilling')}: $${formatUSD(originalBilling)}`}</MetadataTypography>
          )}
        </Stack>
      )}

      {billingRules.map((rule, index) => {
        const summary = summarizeRule(rule);
        return (
          <MetadataTypography
            key={`billing-rule-${index}`}
          >{`${rule.name || `rule-${index + 1}`}${summary ? ` | ${summary}` : ''}`}</MetadataTypography>
        );
      })}

      <Box sx={{ height: 1, bgcolor: 'rgba(255,255,255,0.12)' }} />
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: 'grey.300' }}>
          {t('logPage.quotaDetail.actualBilling')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'success.light', fontWeight: 700 }}>
          {displayValue}
        </Typography>
      </Stack>
    </Stack>
  );

  return (
    <Tooltip title={tooltipContent} placement="top" arrow slotProps={detailTooltipSlotProps} disableInteractive>
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

function formatRatio(value) {
  if (value == null || !Number.isFinite(value)) {
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
    cached_write_5m_tokens: 'Cached Write Tokens (5m)',
    cached_write_1h_tokens: 'Cached Write Tokens (1h)',
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
      .filter((detail) =>
        ['cached_tokens', 'cached_write_tokens', 'cached_write_5m_tokens', 'cached_write_1h_tokens', 'cached_read_tokens'].includes(
          detail.key
        )
      )
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
    { key: 'cached_write_5m_tokens', label: 'Cached Write Tokens (5m)', isInput: true },
    { key: 'cached_write_1h_tokens', label: 'Cached Write Tokens (1h)', isInput: true },
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
    .filter((detail) =>
      ['cached_tokens', 'cached_write_tokens', 'cached_write_5m_tokens', 'cached_write_1h_tokens', 'cached_read_tokens'].includes(
        detail.key
      )
    )
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
    cached_write_5m_tokens: 'Cache Write 5m',
    cached_write_1h_tokens: 'Cache Write 1h',
    cached_read_tokens: 'Cache Read',
    reasoning_tokens: 'Reasoning',
    input_audio_tokens: 'Audio In',
    output_audio_tokens: 'Audio Out',
    input_image_tokens: 'Image In',
    output_image_tokens: 'Image Out'
  };

  return labels[key] || key;
}

function getMetricIcon(key) {
  const icons = {
    input: 'material-symbols:input-rounded',
    output: 'material-symbols:output-rounded',
    cached_tokens: 'mdi:database-outline',
    cached_write_tokens: 'mdi:database-arrow-up-outline',
    cached_write_5m_tokens: 'mdi:database-arrow-up-outline',
    cached_write_1h_tokens: 'mdi:database-clock-outline',
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

function DurationMetric({ icon, value, color }) {
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
      <Typography variant="caption" sx={{ fontWeight: 700, color: getStatusTextColor(color) }}>
        {value}
      </Typography>
    </Box>
  );
}

DurationMetric.propTypes = {
  icon: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired
};
