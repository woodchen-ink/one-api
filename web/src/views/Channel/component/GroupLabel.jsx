import PropTypes from 'prop-types';
import Label from 'ui-component/Label';
import Stack from '@mui/material/Stack';

const GroupLabel = ({ group, groupOptions }) => {
  let groups = [];
  if (!group || group === '') {
    groups = ['default'];
  } else {
    groups = group.split(',');
  }

  // 按 groupOptions 的顺序排序（groupOptions 已按后端 ID 排序）
  if (groupOptions && groupOptions.length > 0) {
    const orderMap = new Map(groupOptions.map((g, i) => [g, i]));
    groups.sort((a, b) => {
      const ia = orderMap.has(a) ? orderMap.get(a) : Infinity;
      const ib = orderMap.has(b) ? orderMap.get(b) : Infinity;
      return ia - ib;
    });
  } else {
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
  group: PropTypes.string,
  groupOptions: PropTypes.array
};

export default GroupLabel;
