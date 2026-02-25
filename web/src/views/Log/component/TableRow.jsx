import PropTypes from 'prop-types';
import { useMemo, memo } from 'react';
import { ArrowForward } from '@mui/icons-material';

import Badge from '@mui/material/Badge';

import { TableRow, TableCell, Stack, Tooltip, Typography } from '@mui/material';

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


  const { totalInputTokens, totalOutputTokens, show, tokenDetails } = useMemo(() => calculateTokens(item), [item]);



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
            <Label color={requestTimeLabelOptions(request_time)}>
              {item.request_time === 0 ? '无' : request_time_str}
            </Label>
          </TableCell>
        )}
        {columnVisibility.tokens && (
          <TableCell sx={{ p: '10px 8px' }}>
            {viewTokens(item, t, totalInputTokens, totalOutputTokens, show, tokenDetails)}
          </TableCell>
        )}
        {columnVisibility.quota && (
          <TableCell sx={{ p: '10px 8px' }}>
            {item.quota ? renderQuota(item.quota, 6) : '$0'}
          </TableCell>
        )}
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

const MetadataTypography = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.grey[300],
  '&:not(:last-child)': {
    marginBottom: theme.spacing(0.5)
  }
}));

function viewTokens(item, t, totalInputTokens, totalOutputTokens, show, tokenDetails) {
  const { prompt_tokens, completion_tokens } = item;

  if (!prompt_tokens && !completion_tokens) return '';

  const content = (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
      <Typography variant="caption" color="text.secondary">
        {prompt_tokens || 0}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        /
      </Typography>
      <Typography variant="caption" color="text.primary">
        {completion_tokens || 0}
      </Typography>
    </Stack>
  );

  if (!show) return content;

  const tooltipContent = tokenDetails.map(({ key, label, tokens, value, rate, labelParams }) => (
    <MetadataTypography key={key}>{`${t(label, labelParams)}: ${value} *  (${rate} - 1) = ${tokens}`}</MetadataTypography>
  ));

  return (
    <Badge variant="dot" color="primary">
      <Tooltip
        title={
          <>
            {tooltipContent}
            <MetadataTypography>
              {t('logPage.totalInputTokens')}: {totalInputTokens}
            </MetadataTypography>
            <MetadataTypography>
              {t('logPage.totalOutputTokens')}: {totalOutputTokens}
            </MetadataTypography>
          </>
        }
        placement="top"
        arrow
      >
        <span style={{ cursor: 'help' }}>{content}</span>
      </Tooltip>
    </Badge>
  );
}

function calculateTokens(item) {
  const { prompt_tokens, completion_tokens, metadata } = item;

  if (!prompt_tokens || !metadata) {
    return {
      totalInputTokens: prompt_tokens || 0,
      totalOutputTokens: completion_tokens || 0,
      show: false,
      tokenDetails: []
    };
  }

  let totalInputTokens = prompt_tokens;
  let totalOutputTokens = completion_tokens;
  let show = false;

  const input_audio_tokens = metadata?.input_audio_tokens_ratio || 1;
  const output_audio_tokens = metadata?.output_audio_tokens_ratio || 1;
  const input_image_tokens = metadata?.input_image_tokens_ratio || 1;
  const output_image_tokens = metadata?.output_image_tokens_ratio || 1;

  const cached_ratio = metadata?.cached_tokens_ratio || 1;
  const cached_write_ratio = metadata?.cached_write_tokens_ratio || 1;
  const cached_read_ratio = metadata?.cached_read_tokens_ratio || 1;
  const reasoning_tokens = metadata?.reasoning_tokens_ratio || 1;
  const input_text_tokens_ratio = metadata?.input_text_tokens_ratio || 1;
  const output_text_tokens_ratio = metadata?.output_text_tokens_ratio || 1;

  const tokenDetails = [
    {
      key: 'input_text_tokens',
      label: 'logPage.inputTextTokens',
      rate: input_text_tokens_ratio,
      labelParams: { ratio: input_text_tokens_ratio }
    },
    {
      key: 'output_text_tokens',
      label: 'logPage.outputTextTokens',
      rate: output_text_tokens_ratio,
      labelParams: { ratio: output_text_tokens_ratio }
    },
    {
      key: 'input_audio_tokens',
      label: 'logPage.inputAudioTokens',
      rate: input_audio_tokens,
      labelParams: { ratio: input_audio_tokens }
    },
    {
      key: 'output_audio_tokens',
      label: 'logPage.outputAudioTokens',
      rate: output_audio_tokens,
      labelParams: { ratio: output_audio_tokens }
    },
    { key: 'cached_tokens', label: 'logPage.cachedTokens', rate: cached_ratio, labelParams: { ratio: cached_ratio } },
    {
      key: 'cached_write_tokens',
      label: 'logPage.cachedWriteTokens',
      rate: cached_write_ratio,
      labelParams: { ratio: cached_write_ratio }
    },
    { key: 'cached_read_tokens', label: 'logPage.cachedReadTokens', rate: cached_read_ratio, labelParams: { ratio: cached_read_ratio } },
    { key: 'reasoning_tokens', label: 'logPage.reasoningTokens', rate: reasoning_tokens, labelParams: { ratio: reasoning_tokens } },
    {
      key: 'input_image_tokens',
      label: 'logPage.inputImageTokens',
      rate: input_image_tokens,
      labelParams: { ratio: input_image_tokens }
    },
    {
      key: 'output_image_tokens',
      label: 'logPage.outputImageTokens',
      rate: output_image_tokens,
      labelParams: { ratio: output_image_tokens }
    }
  ]
    .filter(({ key }) => metadata[key] > 0)
    .map(({ key, label, rate, labelParams }) => {
      const tokens = Math.ceil(metadata[key] * (rate - 1));

      // Check if this token type affects input or output totals
      const isInputToken = [
        'input_text_tokens',
        'output_text_tokens',
        'input_audio_tokens',
        'cached_tokens',
        'cached_write_tokens',
        'cached_read_tokens',
        'input_image_tokens'
      ].includes(key);

      const isOutputToken = ['output_audio_tokens', 'reasoning_tokens', 'output_image_tokens'].includes(key);

      if (isInputToken) {
        totalInputTokens += tokens;
        show = true;
      } else if (isOutputToken) {
        totalOutputTokens += tokens;
        show = true;
      }

      return { key, label, tokens, value: metadata[key], rate, labelParams };
    });

  return {
    totalInputTokens,
    totalOutputTokens,
    show,
    tokenDetails
  };
}

