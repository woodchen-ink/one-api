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
  Button,
  Stack
} from '@mui/material';

import TableSwitch from 'ui-component/Switch';
import { timestamp2string } from 'utils/common';

import { Icon } from '@iconify/react';

export default function TutorialTableRow({ item, manageTutorial, handleOpenModal, setModalTutorialId, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [open, setOpen] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.status);

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
    const switchValue = statusSwitch === 1 ? 2 : 1;
    const { success } = await manageTutorial(item.id, 'status', switchValue);
    if (success) {
      setStatusSwitch(switchValue);
    }
  };

  const handleDelete = async () => {
    handleCloseMenu();
    await manageTutorial(item.id, 'delete', '');
  };

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.id}</TableCell>
        <TableCell>{item.title}</TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>{item.sort}</span>
            <IconButton size="small" disabled={isFirst} onClick={() => onMoveUp(item)} sx={{ p: 0.25 }}>
              <Icon icon="solar:alt-arrow-up-bold-duotone" width={16} />
            </IconButton>
            <IconButton size="small" disabled={isLast} onClick={() => onMoveDown(item)} sx={{ p: 0.25 }}>
              <Icon icon="solar:alt-arrow-down-bold-duotone" width={16} />
            </IconButton>
          </Stack>
        </TableCell>
        <TableCell>
          <TableSwitch id={`switch-${item.id}`} checked={statusSwitch === 1} onChange={handleStatus} />
        </TableCell>
        <TableCell>{timestamp2string(item.created_time)}</TableCell>
        <TableCell>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
            <IconButton onClick={handleOpenMenu} sx={{ color: 'rgb(99, 115, 129)' }}>
              <Icon icon="solar:menu-dots-circle-bold-duotone" />
            </IconButton>
          </Stack>
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
            setModalTutorialId(item.id);
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
        <DialogTitle>删除教程</DialogTitle>
        <DialogContent>
          <DialogContentText>确定要删除教程「{item.title}」吗？</DialogContentText>
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

TutorialTableRow.propTypes = {
  item: PropTypes.object,
  manageTutorial: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalTutorialId: PropTypes.func,
  onMoveUp: PropTypes.func,
  onMoveDown: PropTypes.func,
  isFirst: PropTypes.bool,
  isLast: PropTypes.bool
};
