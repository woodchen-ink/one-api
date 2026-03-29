import PropTypes from 'prop-types';
import { useState } from 'react';
import { formatMoneyByCurrency } from 'utils/common';

import {
  Stack,
  TableRow,
  TableCell,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';

import TableSwitch from 'ui-component/Switch';
import { Icon } from '@iconify/react';

export default function SubscriptionPlanTableRow({ item, managePlan, handleOpenModal, setModalPlanId, durationTypeLabel }) {
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.enable);

  const handleDeleteOpen = () => {
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleStatus = async () => {
    const switchVlue = !statusSwitch;
    const { success } = await managePlan(item.id, 'status');
    if (success) {
      setStatusSwitch(switchVlue);
    }
  };

  const handleDelete = async () => {
    await managePlan(item.id, 'delete');
  };

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.id}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.group_symbol}</TableCell>
        <TableCell>{formatMoneyByCurrency(item.price, item.price_currency || 'USD')}</TableCell>
        <TableCell>{formatMoneyByCurrency(item.quota_amount, 'USD')}</TableCell>
        <TableCell>
          {item.duration_count} {durationTypeLabel(item.duration_type)}
        </TableCell>
        <TableCell>{item.sort}</TableCell>
        <TableCell>
          <TableSwitch id={`switch-${item.id}`} checked={statusSwitch} onChange={handleStatus} />
        </TableCell>
        <TableCell align="center">
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" flexWrap="wrap" useFlexGap>
            <Tooltip title="编辑">
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  handleOpenModal();
                  setModalPlanId(item.id);
                }}
              >
                <Icon icon="solar:pen-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除">
              <IconButton size="small" color="error" onClick={handleDeleteOpen}>
                <Icon icon="solar:trash-bin-trash-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>

      <Dialog open={openDelete} onClose={handleDeleteClose}>
        <DialogTitle>删除确认</DialogTitle>
        <DialogContent>
          <DialogContentText>确定要删除套餐「{item.name}」吗？</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>取消</Button>
          <Button onClick={handleDelete} sx={{ color: 'error.main' }} autoFocus>
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

SubscriptionPlanTableRow.propTypes = {
  item: PropTypes.object,
  managePlan: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalPlanId: PropTypes.func,
  durationTypeLabel: PropTypes.func
};
