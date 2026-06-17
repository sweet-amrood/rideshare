import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/hooks/useAuth';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthTextField from '@/features/auth/components/AuthTextField';
import AuthPasswordField from '@/features/auth/components/AuthPasswordField';
import AuthSubmitButton from '@/features/auth/components/AuthSubmitButton';
import GoogleSignIn from '@/features/auth/components/GoogleSignIn';
import { validateEmail, validatePassword, runValidators, hasErrors } from '@/features/auth/utils/validation';
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const redirectAfterAuth = (user, { requiresProfileCompletion } = {}) => {
    const from = location.state?.from?.pathname;
    if (requiresProfileCompletion || user?.profileCompleted === false || user?.requiresProfileCompletion) {
      navigate('/complete-profile', { replace: true });
      return;
    }
    const needsOnboarding = user?.onboardingComplete === false;
    navigate(needsOnboarding ? '/onboarding' : from || '/dashboard', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const errors = runValidators({
      email: validateEmail(email),
      password: validatePassword(password)
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    const res = await login(email.trim(), password);
    setSubmitting(false);

    if (res.success) {
      toast.success('Welcome back!');
      redirectAfterAuth(res.user);
    } else if (res.requiresEmailVerification) {
      toast('Verify your email to continue', { icon: '✉️' });
      navigate('/verify-email', { state: { email: res.email || email } });
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  const handleGoogle = async (credential) => {
    setSubmitting(true);
    const res = await googleLogin(credential);
    setSubmitting(false);
    if (res.success) {
      toast.success(
        res.requiresProfileCompletion ? 'Almost done — add your phone number' : 'Signed in with Google'
      );
      redirectAfterAuth(res.user, { requiresProfileCompletion: res.requiresProfileCompletion });
    } else {
      toast.error(res.error || 'Google sign-in failed');
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your commuter account."
      footer={
        <p className="text-xs text-slate-400">
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 no-underline">
            Create an account
          </Link>
        </p>
      }
    >
      {error && (
        <Alert
          severity="error"
          sx={{
            py: 0,
            fontSize: 12,
            bgcolor: 'rgba(127,29,29,0.3)',
            color: '#fca5a5',
            '& .MuiAlert-message': { py: 0.5 }
          }}
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-2" noValidate>
        <AuthTextField
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <AuthPasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />

        <div className="text-right -mt-0.5">
          <Link to="/forgot-password" className="text-xs font-semibold text-brand-400 hover:text-brand-300 no-underline">
            Forgot password?
          </Link>
        </div>

        <AuthSubmitButton loading={submitting}>Sign in</AuthSubmitButton>
      </form>

      <GoogleSignIn onSuccess={handleGoogle} disabled={submitting} />
    </AuthShell>
  );
}
