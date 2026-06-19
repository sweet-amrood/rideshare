import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { HiOutlineShieldCheck } from 'react-icons/hi';
import { useAuth } from '@/hooks/useAuth';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthSubmitButton from '@/features/auth/components/AuthSubmitButton';
import OtpInput from '@/features/auth/components/OtpInput';
import { validateOtp, hasErrors, runValidators } from '@/features/auth/utils/validation';
import { paths } from '@/app/router/paths';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendEmailVerification, error, clearError } = useAuth();

  const email = location.state?.email || '';
  const [code, setCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [mockWarning, setMockWarning] = useState(false);

  useEffect(() => {
    if (!email) {
      toast.error('Enter your email via registration or login first.');
    }
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!email) {
      navigate(paths.register);
      return;
    }

    const errors = runValidators({ code: validateOtp(code) });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    const res = await verifyEmail(email, code);
    setSubmitting(false);

    if (res.success) {
      toast.success('Email verified! Welcome to Ride Share.');
      navigate(paths.onboarding, { replace: true });
    } else {
      toast.error(res.error || error);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    const res = await resendEmailVerification(email);
    setResending(false);
    if (res.success) {
      setMockWarning(!!res.mockSent);
      toast.success(res.message || 'Code resent');
    } else {
      toast.error(res.error);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle={
        email ? (
          <>
            We sent a 6-digit code to <strong className="text-brand-300">{email}</strong>
          </>
        ) : (
          'Check your inbox for the verification code'
        )
      }
      footer={
        <Link to={paths.login} className="text-sm font-semibold text-brand-400 hover:text-brand-300">
          Back to sign in
        </Link>
      }
    >
      <div className="flex justify-center">
        <span className="h-14 w-14 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400">
          <HiOutlineShieldCheck className="h-7 w-7" />
        </span>
      </div>

      {error && (
        <Alert severity="error" sx={{ bgcolor: 'rgba(127,29,29,0.3)', color: '#fca5a5' }}>
          {error}
        </Alert>
      )}
      {mockWarning && (
        <Alert severity="warning" sx={{ bgcolor: 'rgba(120,83,0,0.2)', color: '#fde047', fontSize: 12 }}>
          SMTP not configured — check the backend terminal for your code.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <OtpInput value={code} onChange={setCode} error={fieldErrors.code} disabled={submitting} />
        <AuthSubmitButton loading={submitting}>Verify & continue</AuthSubmitButton>
      </form>

      <Button
        fullWidth
        variant="text"
        disabled={resending || !email}
        onClick={handleResend}
        sx={{ color: '#798df9', fontWeight: 600, mt: 1 }}
      >
        {resending ? 'Sending...' : 'Resend verification code'}
      </Button>
    </AuthShell>
  );
}
