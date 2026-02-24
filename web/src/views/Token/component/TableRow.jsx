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
  Tooltip,
  Stack
} from '@mui/material';

import TableSwitch from 'ui-component/Switch';
import { renderQuota, timestamp2string, copy } from 'utils/common';
import Label from 'ui-component/Label';

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

export default function TokensTableRow({ item, manageToken, userGroup, userIsReliable, isAdminSearch }) {
  const { t } = useTranslation();
  const [openDelete, setOpenDelete] = useState(false);
  const [statusSwitch, setStatusSwitch] = useState(item.status);
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
          {isAdminSearch ? (
            // 管理员搜索模式：分组/备用分组两行显示
            <Stack direction="column" spacing={0.5}>
              <Label color={userGroup[item.group]?.color}>{userGroup[item.group]?.name || '跟随用户'}</Label>
              <Label color={userGroup[item.backup_group]?.color}>{userGroup[item.backup_group]?.name || '-'}</Label>
            </Stack>
          ) : (
            // 普通模式：只显示分组
            <Label color={userGroup[item.group]?.color}>{userGroup[item.group]?.name || '跟随用户'}</Label>
          )}
        </TableCell>
        {userIsReliable && (
          <TableCell>
            <Label color={userGroup[item.setting?.billing_tag]?.color}>{userGroup[item.setting?.billing_tag]?.name || '-'}</Label>
          </TableCell>
        )}
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

        <TableCell>
          {item.accessed_time ? timestamp2string(item.accessed_time) : '-'}
        </TableCell>

        <TableCell>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => {
                copy(`sk-${item.key}`, t('token_index.token'));
              }}
            >
              {t('token_index.copy')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleDeleteOpen}
            >
              {t('token_index.delete')}
            </Button>
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
  userGroup: PropTypes.object,
  userIsReliable: PropTypes.bool,
  isAdminSearch: PropTypes.bool
};
