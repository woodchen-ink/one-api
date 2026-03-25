import { Card, Stack } from '@mui/material';
import Statistics from './component/Statistics';
import Overview from './component/Overview';

export default function MarketingData() {
  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Statistics />
      </Card>
      <Overview />
    </Stack>
  );
}
