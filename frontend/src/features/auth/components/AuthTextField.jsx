import TextField from '@mui/material/TextField';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(22, 29, 48, 0.8)',
    color: '#f1f5f9',
    '& fieldset': { borderColor: 'rgba(52, 64, 97, 0.8)' },
    '&:hover fieldset': { borderColor: 'rgba(79, 94, 244, 0.5)' },
    '&.Mui-focused fieldset': { borderColor: '#4f5ef4' }
  },
  '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8125rem' },
  '& .MuiFormHelperText-root': { marginLeft: 0, marginTop: 2, lineHeight: 1.2, fontSize: '0.7rem' }
};

export default function AuthTextField({
  label,
  error,
  helperText,
  fullWidth = true,
  ...props
}) {
  return (
    <TextField
      label={label}
      size="small"
      fullWidth={fullWidth}
      error={Boolean(error)}
      helperText={error || helperText}
      sx={fieldSx}
      {...props}
    />
  );
}
