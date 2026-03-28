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
  Stack,
  Box
} from '@mui/material';

import TableSwitch from 'ui-component/Switch';
import { timestamp2string } from 'utils/common';

import { Icon } from '@iconify/react';

export default function TutorialTableRow({
  item,
  manageTutorial,
  handleOpenModal,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  dragDisabled
}) {
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.status);

  // handleDeleteOpen shows the confirmation dialog before a destructive action.
  const handleDeleteOpen = () => {
    setOpenDelete(true);
  };

  // handleDeleteClose hides the confirmation dialog without deleting anything.
  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  // handleStatus toggles tutorial visibility in the docs page.
  const handleStatus = async () => {
    const switchValue = statusSwitch === 1 ? 2 : 1;
    const result = await manageTutorial(item.id, 'status', switchValue);
    if (result?.success) {
      setStatusSwitch(switchValue);
    }
  };

  // handleDelete removes the tutorial after the user confirms the dialog.
  const handleDelete = async () => {
    await manageTutorial(item.id, 'delete', '');
    setOpenDelete(false);
  };

  return (
    <>
      <TableRow
        hover
        tabIndex={item.id}
        onDragOver={(event) => onDragOver(event, item.id)}
        onDrop={onDrop}
        sx={{
          opacity: isDragging ? 0.45 : 1,
          backgroundColor: isDragging ? 'action.hover' : 'inherit',
          transition: 'background-color 0.2s ease, opacity 0.2s ease'
        }}
      >
        <TableCell align="center" sx={{ width: 72 }}>
          <Box
            draggable={!dragDisabled}
            onDragStart={(event) => onDragStart(event, item.id)}
            onDragEnd={onDragEnd}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: dragDisabled ? 'text.disabled' : 'text.secondary',
              cursor: dragDisabled ? 'not-allowed' : 'grab',
              borderRadius: 1,
              p: 0.5,
              '&:hover': {
                backgroundColor: dragDisabled ? 'transparent' : 'action.hover'
              },
              '&:active': {
                cursor: dragDisabled ? 'not-allowed' : 'grabbing'
              }
            }}
          >
            <Icon icon="solar:hamburger-menu-line-duotone" width={18} />
          </Box>
        </TableCell>
        <TableCell>{item.id}</TableCell>
        <TableCell>{item.title}</TableCell>
        <TableCell>{item.sort}</TableCell>
        <TableCell>
          <TableSwitch id={`switch-${item.id}`} checked={statusSwitch === 1} onChange={handleStatus} />
        </TableCell>
        <TableCell>{timestamp2string(item.created_time)}</TableCell>
        <TableCell>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Tooltip title="编辑">
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  handleOpenModal(item.id);
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
  onDragStart: PropTypes.func,
  onDragOver: PropTypes.func,
  onDrop: PropTypes.func,
  onDragEnd: PropTypes.func,
  isDragging: PropTypes.bool,
  dragDisabled: PropTypes.bool
};
