import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineMail } from 'react-icons/hi';
import { useAuth } from '@/hooks/useAuth';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthTextField from '@/features/auth/components/AuthTextField';
import AuthSubmitButton from '@/features/auth/components/AuthSubmitButton';
import { validateEmail, hasErrors, runValidators } from '@/features/auth/utils/validation';
import { paths } from '@/app/router/paths';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const errors = runValidators({ email: validateEmail(email) });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    const res = await forgotPassword(email.trim());
    setSubmitting(false);

    if (res.success) {
      toast.success('If an account exists, a reset code was sent.');
      navigate(paths.resetPassword, { state: { email: email.trim() } });
    } else {
      toast.error(res.error);
    }
  };

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we'll send a 6-digit code to reset your password."
      footer={
        <Link to={paths.login} className="text-sm font-semibold text-brand-400 hover:text-brand-300">
          Back to sign in
        </Link>
      }
    >
      <div className="flex justify-center">
        <span className="h-14 w-14 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400">
          <HiOutlineMail className="h-7 w-7" />
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthTextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
        />
        <AuthSubmitButton loading={submitting}>Send reset code</AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
