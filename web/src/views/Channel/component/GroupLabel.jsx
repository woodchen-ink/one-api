import PropTypes from 'prop-types';
import Label from 'ui-component/Label';
import Stack from '@mui/material/Stack';

const GroupLabel = ({ group }) => {
  let groups = [];
  if (!group || group === '') {
    groups = ['default'];
  } else {
    groups = group.split(',');
    groups.sort();
  }
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {groups.map((g, index) => (
        <Label key={index}>{g}</Label>
      ))}
    </Stack>
  );
};

GroupLabel.propTypes = {
  group: PropTypes.string
};

export default GroupLabel;
