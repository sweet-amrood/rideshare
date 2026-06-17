import { useRef } from 'react';
import TextField from '@mui/material/TextField';

const boxSx = {
  width: { xs: 40, sm: 48 },
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(22, 29, 48, 0.9)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1.25rem',
    '& fieldset': { borderColor: 'rgba(52, 64, 97, 0.8)' },
    '&.Mui-focused fieldset': { borderColor: '#4f5ef4' }
  }
};

export default function OtpInput({ value = '', onChange, error, disabled }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const updateAt = (index, char) => {
    const clean = char.replace(/\D/g, '').slice(-1);
    const arr = digits.map((d) => (d === ' ' ? '' : d));
    arr[index] = clean;
    const next = arr.join('').trimEnd();
    onChange(next.replace(/\s/g, ''));
    if (clean && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div>
      <div className="flex justify-center gap-2 sm:gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <TextField
            key={i}
            inputRef={(el) => {
              refs.current[i] = el;
            }}
            value={digits[i]?.trim() ? digits[i] : ''}
            onChange={(e) => updateAt(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={disabled}
            inputProps={{
              maxLength: 1,
              inputMode: 'numeric',
              className: 'text-center',
              'aria-label': `Digit ${i + 1}`
            }}
            sx={boxSx}
          />
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
