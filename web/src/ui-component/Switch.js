import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';

const TableSwitch = styled(Switch)(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    width: 40,
    height: 22,
    padding: 0,
    '& .MuiSwitch-switchBase': {
      padding: 3,
      '&.Mui-checked': {
        transform: 'translateX(18px)',
        color: '#fff',
        '& + .MuiSwitch-track': {
          opacity: 1,
          backgroundColor: isDark ? '#2A367A' : '#1B2152'
        }
      }
    },
    '& .MuiSwitch-thumb': {
      boxShadow: 'none',
      width: 16,
      height: 16,
      backgroundColor: '#fff'
    },
    '& .MuiSwitch-track': {
      borderRadius: 11,
      opacity: 1,
      backgroundColor: isDark ? 'rgba(149, 160, 174, 0.4)' : '#ccd1d8'
    }
  };
});

export default TableSwitch;
