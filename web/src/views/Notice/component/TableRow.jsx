import PropTypes from 'prop-types';
import { useState } from 'react';

import {
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
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

export default function NoticeTableRow({ item, manageNotice, handleOpenModal, setModalNoticeId }) {
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.status);

  const handleDeleteOpen = () => {
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleStatus = async () => {
    const switchValue = statusSwitch === 1 ? 2 : 1;
    const { success } = await manageNotice(item.id, 'status', switchValue);
    if (success) {
      setStatusSwitch(switchValue);
    }
  };

  const handleDelete = async () => {
    await manageNotice(item.id, 'delete', '');
  };

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.id}</TableCell>
        <TableCell>{item.title}</TableCell>
        <TableCell>{timestamp2string(item.publish_time)}</TableCell>
        <TableCell>{item.sort}</TableCell>
        <TableCell>
          <TableSwitch id={`switch-${item.id}`} checked={statusSwitch === 1} onChange={handleStatus} />
        </TableCell>
        <TableCell>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Tooltip title="编辑">
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  handleOpenModal();
                  setModalNoticeId(item.id);
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
        <DialogTitle>删除公告</DialogTitle>
        <DialogContent>
          <DialogContentText>确定要删除公告「{item.title}」吗？</DialogContentText>
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

NoticeTableRow.propTypes = {
  item: PropTypes.object,
  manageNotice: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalNoticeId: PropTypes.func
};
