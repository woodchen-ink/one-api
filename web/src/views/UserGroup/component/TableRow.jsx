import PropTypes from 'prop-types';
import { useState } from 'react';

import {
  Stack,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button
} from '@mui/material';

import Label from 'ui-component/Label';
import TableSwitch from 'ui-component/Switch';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';

export default function UserGroupTableRow({ item, manageUserGroup, handleOpenModal, setModalUserGroupId }) {
  const { t } = useTranslation();
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
    const { success } = await manageUserGroup(item.id, 'status');
    if (success) {
      setStatusSwitch(switchVlue);
    }
  };

  const handleDelete = async () => {
    await manageUserGroup(item.id, 'delete');
  };

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.id}</TableCell>

        <TableCell>{item.symbol}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.ratio}</TableCell>
        <TableCell>{item.api_rate}</TableCell>
        <TableCell>
          <Label variant="outlined" color={item.public ? 'primary' : 'error'}>
            {item.public ? '是' : '否'}
          </Label>
        </TableCell>
        <TableCell>
          <Label variant="outlined" color={item.promotion ? 'primary' : 'error'}>
            {item.promotion ? '是' : '否'}
          </Label>
        </TableCell>
        <TableCell>{item.min}</TableCell>
        <TableCell>{item.max}</TableCell>
        <TableCell>
          {' '}
          <TableSwitch id={`switch-${item.id}`} checked={statusSwitch} onChange={handleStatus} />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  handleOpenModal();
                  setModalUserGroupId(item.id);
                }}
              >
                <Icon icon="solar:pen-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton size="small" color="error" onClick={handleDeleteOpen}>
                <Icon icon="solar:trash-bin-trash-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>

      <Dialog open={openDelete} onClose={handleDeleteClose}>
        <DialogTitle>{t('common.delete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('common.deleteConfirm', { title: item.name })}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>{t('common.close')}</Button>
          <Button onClick={handleDelete} sx={{ color: 'error.main' }} autoFocus>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

UserGroupTableRow.propTypes = {
  item: PropTypes.object,
  manageUserGroup: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalUserGroupId: PropTypes.func
};
