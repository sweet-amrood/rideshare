import { Chip } from '@mui/material';

const MAP = {
  ACTIVE: 'success',
  PENDING: 'warning',
  CONFIRMED: 'success',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
  SUSPENDED: 'warning',
  BANNED: 'error',
  COMPLETED: 'info',
  OPEN: 'warning',
  SCHEDULED: 'info'
};

export default function StatusChip({ status }) {
  return (
    <Chip
      label={status}
      size="small"
      color={MAP[status] || 'default'}
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: 10 }}
    />
  );
}
