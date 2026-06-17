import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import AuthTextField from './AuthTextField';

export default function AuthPasswordField({ label = 'Password', ...props }) {
  const [show, setShow] = useState(false);

  return (
    <AuthTextField
      label={label}
      type={show ? 'text' : 'password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              type="button"
              aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow((v) => !v)}
              edge="end"
              size="small"
              sx={{ color: '#94a3b8', '&:hover': { color: '#a3b5fc' } }}
            >
              {show ? <HiOutlineEyeOff className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
            </IconButton>
          </InputAdornment>
        )
      }}
      {...props}
    />
  );
}
