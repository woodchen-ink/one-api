import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import {
  TableRow,
  TableCell,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';

import TableSwitch from 'ui-component/Switch';
import { renderQuota, timestamp2string, copy } from 'utils/common';
import Label from 'ui-component/Label';
import { Icon } from '@iconify/react';

import { useTranslation } from 'react-i18next';

function statusInfo(t, status) {
  switch (status) {
    case 1:
      return t('common.enable');
    case 2:
      return t('common.disable');
    case 3:
      return t('common.expired');
    case 4:
      return t('common.exhaust');
    default:
      return t('common.unknown');
  }
}

function getTokenGroups(item) {
  const groups = [];
  const appendGroup = (group, fallback) => {
    if (!group || groups.some((itemGroup) => itemGroup.value === group)) {
      return;
    }
    groups.push({ value: group, fallback });
  };

  appendGroup(item.group, false);
  appendGroup(item.backup_group, true);
  (item.setting?.fallback_groups || []).forEach((group) => appendGroup(group, true));

  return groups;
}

export default function TokensTableRow({ item, manageToken, handleOpenModal, userGroup, isAdminSearch }) {
  const { t } = useTranslation();
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.status);
  const tokenGroups = getTokenGroups(item);
  const handleDeleteOpen = () => {
    setOpenDelete(true);
  };

  const handleDeleteClose = () => {
    setOpenDelete(false);
  };

  const handleStatus = async () => {
    const switchVlue = statusSwitch === 1 ? 2 : 1;
    const { success } = await manageToken(item.id, 'status', switchVlue);
    if (success) {
      setStatusSwitch(switchVlue);
    }
  };

  const handleDelete = async () => {
    await manageToken(item.id, 'delete', '');
  };

  useEffect(() => {
    setStatusSwitch(item.status);
  }, [item.status]);

  return (
    <>
      <TableRow tabIndex={item.id}>
        {isAdminSearch && (
          <TableCell>
            <Tooltip title={`ID: ${item.user_id}`} placement="top">
              <span>
                {item.user_id} - {item.owner_name || '-'}
              </span>
            </Tooltip>
          </TableCell>
        )}
        <TableCell>{item.name}</TableCell>
        <TableCell>
          <Stack direction="column" spacing={0.5}>
            <Label color={userGroup[item.group]?.color}>{userGroup[item.group]?.name || '跟随用户'}</Label>
            {tokenGroups
              .filter((group) => group.fallback)
              .map((group) => (
                <Label key={group.value} color={userGroup[group.value]?.color}>
                  {userGroup[group.value]?.name || group.value}
                </Label>
              ))}
            {isAdminSearch && tokenGroups.length === 1 && <Label color="default">-</Label>}
          </Stack>
        </TableCell>
        <TableCell>
          <Tooltip
            title={(() => {
              return statusInfo(t, statusSwitch);
            })()}
            placement="top"
          >
            <TableSwitch
              id={`switch-${item.id}`}
              checked={statusSwitch === 1}
              onChange={handleStatus}
              // disabled={statusSwitch !== 1 && statusSwitch !== 2}
            />
          </Tooltip>
        </TableCell>

        {isAdminSearch ? (
          // 管理员搜索模式：合并额度显示
          <TableCell>
            <Stack direction="column" spacing={0.5}>
              <span>{renderQuota(item.used_quota)}</span>
              <span style={{ color: 'text.secondary' }}>
                {item.unlimited_quota ? t('token_index.unlimited') : renderQuota(item.remain_quota, 2)}
              </span>
            </Stack>
          </TableCell>
        ) : (
          // 普通模式：分开显示
          <>
            <TableCell>{renderQuota(item.used_quota)}</TableCell>
            <TableCell>{item.unlimited_quota ? t('token_index.unlimited') : renderQuota(item.remain_quota, 2)}</TableCell>
          </>
        )}

        {isAdminSearch ? (
          // 管理员搜索模式：合并时间显示
          <TableCell>
            <Stack direction="column" spacing={0.5}>
              <span>{timestamp2string(item.created_time)}</span>
              <span style={{ color: 'text.secondary' }}>
                {item.expired_time === -1 ? t('token_index.neverExpires') : timestamp2string(item.expired_time)}
              </span>
            </Stack>
          </TableCell>
        ) : (
          // 普通模式：分开显示
          <>
            <TableCell>{timestamp2string(item.created_time)}</TableCell>
            <TableCell>{item.expired_time === -1 ? t('token_index.neverExpires') : timestamp2string(item.expired_time)}</TableCell>
          </>
        )}

        <TableCell>{item.accessed_time ? timestamp2string(item.accessed_time) : '-'}</TableCell>

        <TableCell>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
            <Tooltip title={t('token_index.copy')} placement="top">
              <IconButton size="small" onClick={() => copy(`sk-${item.key}`, t('token_index.token'))}>
                <Icon icon="solar:copy-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.edit')} placement="top">
              <IconButton size="small" onClick={() => handleOpenModal(item.id)}>
                <Icon icon="solar:pen-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('token_index.delete')} placement="top">
              <IconButton size="small" color="error" onClick={handleDeleteOpen}>
                <Icon icon="solar:trash-bin-trash-bold-duotone" width={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>

      <Dialog open={openDelete} onClose={handleDeleteClose}>
        <DialogTitle>{t('token_index.deleteToken')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('token_index.confirmDeleteToken')} {item.name}？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>{t('token_index.close')}</Button>
          <Button onClick={handleDelete} sx={{ color: 'error.main' }} autoFocus>
            {t('token_index.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

TokensTableRow.propTypes = {
  item: PropTypes.object,
  manageToken: PropTypes.func,
  handleOpenModal: PropTypes.func,
  userGroup: PropTypes.object,
  isAdminSearch: PropTypes.bool
};
