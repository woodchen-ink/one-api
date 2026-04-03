import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { Box, List, Button, ListItem, TextField, IconButton, ListItemSecondaryAction } from '@mui/material';

import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';

const MapInput = ({ mapValue, onChange, disabled, error, label }) => {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState([]);

  useEffect(() => {
    try {
      setMappings(mapValue || [{ index: 0, key: '', value: '' }]);
    } catch (e) {
      setMappings([{ index: 0, key: '', value: '' }]);
    }
  }, [mapValue]);

  const handleAdd = () => {
    const newIndex = mappings.length > 0 ? Math.max(...mappings.map((m) => m.index)) + 1 : 0;
    setMappings([...mappings, { index: newIndex, key: '', value: '' }]);
  };

  const handleDelete = (index) => {
    const newMappings = mappings.filter((mapping) => mapping.index !== index);
    setMappings(newMappings);
    updateParent(newMappings);
  };

  const handleChange = (index, field, newValue) => {
    const newMappings = mappings.map((mapping) => (mapping.index === index ? { ...mapping, [field]: newValue } : mapping));

    setMappings(newMappings);
    updateParent(newMappings);
  };

  const updateParent = (newMappings) => {
    onChange(newMappings);
  };

  return (
    <Box>
      <List>
        {mappings.map(({ index, key, value }) => (
          <ListItem key={index}>
            <TextField
              label={label.keyName}
              value={key}
              onChange={(e) => handleChange(index, 'key', e.target.value)}
              disabled={disabled}
              error={error}
              sx={{ mr: 1, flex: 1 }}
            />
            <TextField
              label={label.valueName}
              value={value}
              onChange={(e) => handleChange(index, 'value', e.target.value)}
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
        {t('channel_edit.mapAdd', { name: label.name })}
      </Button>
    </Box>
  );
};

MapInput.propTypes = {
  mapValue: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  label: PropTypes.shape({
    name: PropTypes.string,
    keyName: PropTypes.string,
    valueName: PropTypes.string
  }).isRequired
};

export default MapInput;
