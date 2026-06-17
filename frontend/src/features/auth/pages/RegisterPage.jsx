import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/hooks/useAuth';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthTextField from '@/features/auth/components/AuthTextField';
import AuthPasswordField from '@/features/auth/components/AuthPasswordField';
import AuthSubmitButton from '@/features/auth/components/AuthSubmitButton';
import GoogleSignIn from '@/features/auth/components/GoogleSignIn';
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  runValidators,
  hasErrors
} from '@/features/auth/utils/validation';
import { filterDigits, filterPersonName } from '@/utils/inputFilters';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, googleLogin, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [mockWarning, setMockWarning] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const form = e.currentTarget;
    const formName = (form.elements.namedItem('fullName')?.value ?? name).toString();
    const formEmail = (form.elements.namedItem('email')?.value ?? email).toString();
    const formPhone = (form.elements.namedItem('phone')?.value ?? phone).toString();
    const formPassword = (form.elements.namedItem('password')?.value ?? password).toString();
    const formConfirm = (form.elements.namedItem('confirmPassword')?.value ?? confirmPassword).toString();

    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedPhone = formPhone.trim();

    const errors = runValidators({
      name: validateName(trimmedName),
      email: validateEmail(trimmedEmail),
      phone: validatePhone(trimmedPhone),
      password: validatePassword(formPassword),
      confirmPassword: formPassword !== formConfirm ? 'Passwords do not match' : ''
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setName(trimmedName);
    setEmail(trimmedEmail);
    setPhone(trimmedPhone);
    setPassword(formPassword);
    setConfirmPassword(formConfirm);

    setSubmitting(true);
    const res = await register(trimmedName, trimmedEmail, formPassword, trimmedPhone);
    setSubmitting(false);

    if (res.success && res.requiresEmailVerification) {
      setMockWarning(!!res.mockSent);
      toast.success('Account created! Check your email for the verification code.');
      navigate('/verify-email', { state: { email: res.email || email } });
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  const handleGoogle = async (credential) => {
    clearError();
    setSubmitting(true);
    const res = await googleLogin(credential);
    setSubmitting(false);
    if (res.success) {
      toast.success(
        res.requiresProfileCompletion
          ? 'Signed up with Google — add your phone number next'
          : 'Welcome to Ride Share!'
      );
      if (res.requiresProfileCompletion || res.user?.profileCompleted === false) {
        navigate('/complete-profile', { replace: true });
      } else if (res.user?.onboardingComplete === false) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  return (
    <AuthShell
      compact
      title="Create your account"
      subtitle="Join verified carpools on your campus or workplace."
      footer={
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 no-underline">
            Sign in
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
      {mockWarning && (
        <Alert
          severity="warning"
          sx={{
            py: 0,
            fontSize: 11,
            bgcolor: 'rgba(120,83,0,0.2)',
            color: '#fde047',
            '& .MuiAlert-message': { py: 0.5 }
          }}
        >
          SMTP not configured — check the backend terminal for your verification code.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-2" noValidate>
        <div className="grid grid-cols-2 gap-2">
          <AuthTextField
            label="Full name"
            name="fullName"
            value={name}
            onChange={(e) => setName(filterPersonName(e.target.value))}
            error={fieldErrors.name}
            autoComplete="name"
          />
          <AuthTextField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onInput={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            autoComplete="email"
          />
        </div>
        <AuthTextField
          label="Mobile"
          name="phone"
          type="tel"
          placeholder="+923001234567"
          value={phone}
          inputMode="numeric"
          onChange={(e) => setPhone(filterDigits(e.target.value))}
          error={fieldErrors.phone}
          autoComplete="tel"
        />
        <div className="grid grid-cols-2 gap-2">
          <AuthPasswordField
            label="Password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onInput={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <AuthPasswordField
            label="Confirm"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onInput={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />
        </div>

        <AuthSubmitButton loading={submitting}>Create account</AuthSubmitButton>
      </form>

      <GoogleSignIn onSuccess={handleGoogle} disabled={submitting} />
    </AuthShell>
  );
}
