import Button from '@mui/material/Button';

/**
 * Example: MUI component with Tailwind layout utilities on the wrapper
 */
export default function MuiTailwindButton({ className = '', children, ...props }) {
  return (
    <div className={className}>
      <Button variant="contained" color="primary" {...props}>
        {children}
      </Button>
    </div>
  );
}
