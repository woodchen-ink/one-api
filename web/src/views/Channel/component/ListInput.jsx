import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { Box, List, Button, ListItem, TextField, IconButton, ListItemSecondaryAction } from '@mui/material';

import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';

const ListInput = ({ listValue, onChange, disabled, error, label }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      setItems(Array.isArray(listValue) ? listValue : []);
    } catch (e) {
      setItems([]);
    }
  }, [listValue]);

  const handleAdd = () => {
    const newItems = [...items, ''];
    setItems(newItems);
    updateParent(newItems);
  };

  const handleDelete = (index) => {
    const newItems = items.filter((_, idx) => idx !== index);
    setItems(newItems);
    updateParent(newItems);
  };

  const handleChange = (index, newValue) => {
    const newItems = [...items];
    newItems[index] = newValue;
    setItems(newItems);
    updateParent(newItems);
  };

  const updateParent = (newItems) => {
    onChange(newItems);
  };

  return (
    <Box>
      <List>
        {items.map((value, index) => (
          <ListItem key={index}>
            <TextField
              label={label?.itemName || '项目'}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              disabled={disabled}
              error={error}
              sx={{ mr: 1, flex: 1 }}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(index)} disabled={disabled}>
                <Icon icon="mdi:delete" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      <Button startIcon={<Icon icon="mdi:plus" />} onClick={handleAdd} disabled={disabled}>
        {t('channel_edit.mapAdd', { name: label?.name || '项目' })}
      </Button>
    </Box>
  );
};

ListInput.propTypes = {
  listValue: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  label: PropTypes.shape({
    name: PropTypes.string,
    itemName: PropTypes.string
  }).isRequired
};

export default ListInput;
