import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineKey } from 'react-icons/hi';
import { useAuth } from '@/hooks/useAuth';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthTextField from '@/features/auth/components/AuthTextField';
import AuthSubmitButton from '@/features/auth/components/AuthSubmitButton';
import OtpInput from '@/features/auth/components/OtpInput';
import {
  validatePassword,
  validateOtp,
  runValidators,
  hasErrors
} from '@/features/auth/utils/validation';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, clearError } = useAuth();

  const email = location.state?.email || '';
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!email) {
      toast.error('Start from forgot password to receive a code.');
      navigate('/forgot-password');
      return;
    }

    const errors = runValidators({
      code: validateOtp(code),
      password: validatePassword(password),
      confirmPassword: password !== confirmPassword ? 'Passwords do not match' : ''
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    const res = await resetPassword(email, code, password);
    setSubmitting(false);

    if (res.success) {
      toast.success(res.message || 'Password updated successfully');
      navigate('/login');
    } else {
      toast.error(res.error);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle={
        email ? (
          <>
            Enter the code sent to <strong className="text-brand-300">{email}</strong>
          </>
        ) : (
          'Enter your reset code and new password'
        )
      }
      footer={
        <Link to="/login" className="text-sm font-semibold text-brand-400 hover:text-brand-300">
          Back to sign in
        </Link>
      }
    >
      <div className="flex justify-center">
        <span className="h-14 w-14 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400">
          <HiOutlineKey className="h-7 w-7" />
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <p className="text-xs text-slate-400 mb-3 text-center uppercase tracking-wider font-semibold">
            Reset code
          </p>
          <OtpInput value={code} onChange={setCode} error={fieldErrors.code} disabled={submitting} />
        </div>

        <AuthTextField
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          autoComplete="new-password"
        />
        <AuthTextField
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
        />

        <AuthSubmitButton loading={submitting}>Update password</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
