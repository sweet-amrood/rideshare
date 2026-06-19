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
import { env } from '@/config/env';
import { DEMO_EMAIL, DEMO_PASSWORD, isDemoActive } from '@/config/demo';
import { paths } from '@/app/router/paths';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, enterDemoMode, error, clearError } = useAuth();

  const [email, setEmail] = useState(env.isProd ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(env.isProd ? DEMO_PASSWORD : '');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const redirectAfterAuth = (user, { requiresProfileCompletion } = {}) => {
    const from = location.state?.from?.pathname;
    if (requiresProfileCompletion || user?.profileCompleted === false || user?.requiresProfileCompletion) {
      navigate(paths.completeProfile, { replace: true });
      return;
    }
    const needsOnboarding = user?.onboardingComplete === false;
    navigate(needsOnboarding ? paths.onboarding : from || paths.dashboard, { replace: true });
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
      navigate(paths.verifyEmail, { state: { email: res.email || email } });
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

  const handleDemoBrowse = async () => {
    clearError();
    setSubmitting(true);
    const res = await enterDemoMode();
    setSubmitting(false);
    if (res.success) {
      toast.success('Portfolio demo — explore the app');
      redirectAfterAuth(res.user);
    } else {
      toast.error(res.error || 'Could not start demo');
    }
  };

  const showDemoPanel = env.isProd || env.demoMode || isDemoActive();

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your commuter account."
      footer={
        <p className="text-xs text-slate-400">
          New here?{' '}
          <Link to={paths.register} className="font-semibold text-brand-400 hover:text-brand-300 no-underline">
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

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
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

        <div className="flex justify-end pt-0.5">
          <Link
            to={paths.forgotPassword}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 no-underline"
          >
            Forgot password?
          </Link>
        </div>

        <div className="pt-1">
          <AuthSubmitButton loading={submitting}>Sign in</AuthSubmitButton>
        </div>
      </form>

      {showDemoPanel && (
        <div className="space-y-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5">
          <p className="text-xs font-semibold text-amber-100">Portfolio demo (no backend)</p>
          <p className="text-[11px] leading-relaxed text-amber-100/80">
            Email: <span className="font-mono">{DEMO_EMAIL}</span>
            <br />
            Password: <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
          <button
            type="button"
            onClick={handleDemoBrowse}
            disabled={submitting}
            className="w-full rounded-lg border border-amber-400/40 bg-amber-500/20 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-500/30 disabled:opacity-60"
          >
            Enter demo &amp; browse app
          </button>
        </div>
      )}

      <GoogleSignIn onSuccess={handleGoogle} disabled={submitting} />
    </AuthShell>
  );
}
