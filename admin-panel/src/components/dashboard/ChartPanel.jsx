import { Paper, Typography, Box, Skeleton } from '@mui/material';

export default function ChartPanel({ title, icon: Icon, children, loading, emptyMessage }) {
  return (
    <Paper className="admin-card p-4 h-full flex flex-col" elevation={0}>
      <Box className="flex items-center gap-2 mb-4">
        {Icon && (
          <Box
            className="flex items-center justify-center rounded-lg"
            sx={{ width: 36, height: 36, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}
          >
            <Icon sx={{ fontSize: 20 }} />
          </Box>
        )}
        <Typography fontWeight={700}>{title}</Typography>
      </Box>
      <Box className="flex-1 min-h-[200px]">
        {loading ? (
          <Skeleton variant="rounded" height={200} />
        ) : emptyMessage ? (
          <Typography variant="body2" color="text.secondary" className="py-12 text-center">
            {emptyMessage}
          </Typography>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
}
