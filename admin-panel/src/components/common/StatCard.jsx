import { Paper, Typography, Box, Skeleton } from '@mui/material';

const ICON_COLORS = {
  primary: { bg: 'rgba(99, 102, 241, 0.2)', fg: '#818cf8' },
  secondary: { bg: 'rgba(34, 211, 238, 0.2)', fg: '#22d3ee' },
  success: { bg: 'rgba(16, 185, 129, 0.2)', fg: '#34d399' },
  warning: { bg: 'rgba(245, 158, 11, 0.2)', fg: '#fbbf24' },
  error: { bg: 'rgba(239, 68, 68, 0.2)', fg: '#f87171' }
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  loading
}) {
  if (loading) return <Skeleton variant="rounded" height={108} className="rounded-xl" />;

  const palette = ICON_COLORS[color] || ICON_COLORS.primary;

  return (
    <Paper className="admin-card p-4 h-full" elevation={0}>
      <Box className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <Typography variant="caption" color="text.secondary" className="uppercase tracking-wider block">
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={800} className="mt-1 text-white">
            {value ?? '—'}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" className="block mt-0.5">
              {subtitle}
            </Typography>
          )}
        </div>
        {Icon && (
          <Box
            className="shrink-0 flex items-center justify-center rounded-xl"
            sx={{
              width: 44,
              height: 44,
              bgcolor: palette.bg,
              color: palette.fg
            }}
          >
            <Icon sx={{ fontSize: 24 }} />
          </Box>
        )}
      </Box>
    </Paper>
  );
}
