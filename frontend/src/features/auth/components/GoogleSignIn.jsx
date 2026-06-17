import { useEffect } from 'react';
import Divider from '@mui/material/Divider';
import { env } from '@/config/env';

export default function GoogleSignIn({ onSuccess, disabled }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: env.googleClientId,
        callback: async (response) => {
          if (onSuccess) await onSuccess(response.credential);
        }
      });

      const el = document.getElementById('google-signin-btn');
      if (el) {
        el.innerHTML = '';
        window.google.accounts.id.renderButton(el, {
          theme: 'filled_blue',
          size: 'medium',
          text: 'signin_with',
          shape: 'rectangular',
          width: el.offsetWidth || 320
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [onSuccess]);

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <Divider
        sx={{
          my: 0.25,
          '&::before, &::after': { borderColor: 'rgba(255,255,255,0.08)' }
        }}
      >
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest px-1.5">
          Or continue with
        </span>
      </Divider>
      <div id="google-signin-btn" className="w-full flex justify-center min-h-[36px]" />
    </div>
  );
}
