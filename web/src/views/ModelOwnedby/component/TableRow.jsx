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

import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import IconWrapper from 'ui-component/IconWrapper';

export default function ModelOwnedbyTableRow({ item, manageModelOwnedBy, handleOpenModal, setModalId }) {
  const { t } = useTranslation();
  const [openDelete, setOpenDelete] = useState(false);

  const handleDeleteOpen = () => {
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleDelete = async () => {
    await manageModelOwnedBy(item.id, 'delete');
  };

  return (
    <>
      <TableRow tabIndex={item.id}>
        <TableCell>{item.id}</TableCell>

        <TableCell>{item.name}</TableCell>
        <TableCell>
          <IconWrapper url={item.icon} />
        </TableCell>
        <TableCell align="center">
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  handleOpenModal();
                  setModalId(item.id);
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

ModelOwnedbyTableRow.propTypes = {
  item: PropTypes.object,
  manageModelOwnedBy: PropTypes.func,
  handleOpenModal: PropTypes.func,
  setModalId: PropTypes.func
};
