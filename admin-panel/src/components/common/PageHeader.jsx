import { Typography, Box } from '@mui/material';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <Box className="flex flex-wrap justify-between items-start gap-4 mb-6">
      <div>
        <Typography variant="h5" fontWeight={800}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" className="mt-1">
            {subtitle}
          </Typography>
        )}
      </div>
      {action}
    </Box>
  );
}
