import PropTypes from 'prop-types';
import { useState } from 'react';

import {
  Popover,
  TableRow,
  MenuItem,
  TableCell,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button
} from '@mui/material';

import TableSwitch from 'ui-component/Switch';
import { Icon } from '@iconify/react';

export default function SubscriptionPlanTableRow({ item, managePlan, handleOpenModal, setModalPlanId, durationTypeLabel }) {
  const [open, setOpen] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.enable);

  const handleDeleteOpen = () => {
    handleCloseMenu();
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleOpenMenu = (event) => {
    setOpen(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setOpen(null);
  };

  const handleStatus = async () => {
    const switchVlue = !statusSwitch;
    const { success } = await managePlan(item.id, 'status');
    if (success) {
      setStatusSwitch(switchVlue);
    }
  };

  const handleDelete = async () => {
    handleCloseMenu();
    await managePlan(item.id, 'delete');
  };

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.id}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.group_symbol}</TableCell>
        <TableCell>${item.price}</TableCell>
        <TableCell>${item.quota_amount}</TableCell>
        <TableCell>
          {item.duration_count} {durationTypeLabel(item.duration_type)}
        </TableCell>
        <TableCell>{item.sort}</TableCell>
        <TableCell>
          <TableSwitch id={`switch-${item.id}`} checked={statusSwitch} onChange={handleStatus} />
        </TableCell>
        <TableCell>
          <IconButton onClick={handleOpenMenu} sx={{ color: 'rgb(99, 115, 129)' }}>
            <Icon icon="solar:menu-dots-circle-bold-duotone" />
          </IconButton>
        </TableCell>
      </TableRow>

      <Popover
        open={!!open}
        anchorEl={open}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { minWidth: 140 }
        }}
      >
        <MenuItem
          onClick={() => {
            handleCloseMenu();
            handleOpenModal();
            setModalPlanId(item.id);
          }}
        >
          <Icon icon="solar:pen-bold-duotone" style={{ marginRight: '16px' }} />
          编辑
        </MenuItem>
        <MenuItem onClick={handleDeleteOpen} sx={{ color: 'error.main' }}>
          <Icon icon="solar:trash-bin-trash-bold-duotone" style={{ marginRight: '16px' }} />
          删除
        </MenuItem>
      </Popover>

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
