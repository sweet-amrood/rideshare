import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { motion } from 'framer-motion';

export default function AuthSubmitButton({ loading, children, ...props }) {
  return (
    <motion.div
      className="w-full"
      whileHover={{ scale: loading ? 1 : 1.01 }}
      whileTap={{ scale: loading ? 1 : 0.99 }}
    >
      <Button
        type="submit"
        variant="contained"
        disabled={loading}
        fullWidth
        sx={{
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          py: 0.9,
          px: 3,
          fontWeight: 700,
          fontSize: '0.875rem',
          border: 'none',
          outline: 'none',
          boxShadow: '0 10px 25px -10px rgba(79, 94, 244, 0.35)',
          background: 'linear-gradient(135deg, #4f5ef4 0%, #3030d4 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #3c42e8 0%, #2a2aa7 100%)',
            boxShadow: '0 10px 25px -10px rgba(79, 94, 244, 0.4)'
          },
          '&:focus': { outline: 'none' },
          '&:focus-visible': { outline: 'none', border: 'none' }
        }}
        {...props}
      >
        {loading ? <CircularProgress size={22} color="inherit" /> : children}
      </Button>
    </motion.div>
  );
}
