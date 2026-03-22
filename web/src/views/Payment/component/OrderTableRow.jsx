import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';

import { IconButton, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material';

import { copy, timestamp2string } from 'utils/common';
import Label from 'ui-component/Label';

const STATUS_COLOR_MAP = {
  pending: 'primary',
  success: 'success',
  failed: 'error',
  closed: 'default'
};

const StatusType = {
  pending: { value: 'pending' },
  success: { value: 'success' },
  failed: { value: 'failed' },
  closed: { value: 'closed' }
};

function statusLabel(status, t) {
  return <Label color={STATUS_COLOR_MAP[status] || 'secondary'}> {t(`orderlogPage.statusMap.${status}`, t('common.unknown'))} </Label>;
}

function paymentTypeLabel(type, t) {
  if (!type) {
    return '-';
  }

  return t(`orderlogPage.paymentTypeMap.${type}`, type);
}

function orderTypeLabel(item, t) {
  if (item.subscription_plan_id > 0) {
    if (!item.gateway_id) {
      return t('orderlogPage.orderTypeMap.admin_assign_subscription');
    }
    return t('orderlogPage.orderTypeMap.subscription_purchase');
  }

  return t('orderlogPage.orderTypeMap.balance_topup');
}

export { StatusType };

function CopyableCell({ value, tooltip, emptyText }) {
  if (!value) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ minWidth: 0, width: '100%' }}>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {value}
      </Typography>
      <Tooltip title={tooltip}>
        <IconButton size="small" onClick={() => copy(value, tooltip)} aria-label={tooltip}>
          <Icon icon="solar:copy-bold-duotone" width={16} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

CopyableCell.propTypes = {
  value: PropTypes.string,
  tooltip: PropTypes.string,
  emptyText: PropTypes.string
};

export default function OrderTableRow({ item, showGatewayId, showGatewayType, showUserId }) {
  const { t } = useTranslation();

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell style={{ minWidth: '180px' }}>{timestamp2string(item.created_at)}</TableCell>
        <TableCell>{orderTypeLabel(item, t)}</TableCell>
        <TableCell style={{ minWidth: '140px' }}>{item.gateway_name || '-'}</TableCell>
        {showGatewayType && <TableCell>{paymentTypeLabel(item.gateway_type, t)}</TableCell>}
        {showGatewayId && <TableCell>{item.gateway_id}</TableCell>}
        {showUserId && <TableCell>{item.user_id}</TableCell>}
        <TableCell align="center">
          <CopyableCell value={item.trade_no} tooltip={t('orderlogPage.tradeNoLabel')} emptyText="-" />
        </TableCell>
        <TableCell align="center">
          <CopyableCell value={item.gateway_no} tooltip={t('orderlogPage.gatewayNoLabel')} emptyText={t('orderlogPage.emptyGatewayNo')} />
        </TableCell>
        <TableCell>${item.amount}</TableCell>
        <TableCell>${item.fee}</TableCell>
        <TableCell>
          {item.discount} {item.order_currency}
        </TableCell>
        <TableCell>
          {item.order_amount} {item.order_currency}
        </TableCell>
        <TableCell>{statusLabel(item.status, t)}</TableCell>
      </TableRow>
    </>
  );
}

OrderTableRow.propTypes = {
  item: PropTypes.object,
  showGatewayId: PropTypes.bool,
  showGatewayType: PropTypes.bool,
  showUserId: PropTypes.bool
};
