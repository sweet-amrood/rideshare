import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/hooks/useAuth';
import AuthShell from '@/features/auth/components/AuthShell';
import AuthTextField from '@/features/auth/components/AuthTextField';
import AuthSubmitButton from '@/features/auth/components/AuthSubmitButton';
import { profileService } from '@/api/services/profile.service';
import { validateEmail, validateName, validatePhone } from '@/features/auth/utils/validation';
import { filterDigits, filterPersonName } from '@/utils/inputFilters';
import { paths } from '@/app/router/paths';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(
    user?.phoneNumber?.startsWith('+923000000000') ? '' : user?.phoneNumber || ''
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const nextErrors = {
      name: validateName(trimmedName),
      email: validateEmail(trimmedEmail),
      phone: validatePhone(trimmedPhone)
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.phone) return;

    setSubmitting(true);
    try {
      const res = await profileService.updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
        profileCompleted: true
      });
      const u = res.data?.user;
      if (u) {
        setUser({
          name: u.name,
          email: u.email,
          phoneNumber: u.phoneNumber,
          profileCompleted: true
        });
      } else {
        setUser({ name: trimmedName, email: trimmedEmail, phoneNumber: trimmedPhone, profileCompleted: true });
      }
      toast.success('Profile saved!');
      const needsOnboarding = u?.onboardingComplete === false || user?.onboardingComplete === false;
      navigate(needsOnboarding ? paths.onboarding : paths.dashboard, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Complete your profile"
      subtitle="You signed in with Google. Add your name and mobile number to finish setting up your account."
      maxWidth="max-w-md"
    >
      <Alert severity="info" sx={{ bgcolor: 'rgba(30,58,138,0.25)', color: '#93c5fd', mb: 2 }}>
        Email from Google is pre-filled. You can update it if needed.
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthTextField
          label="Full name"
          name="fullName"
          value={name}
          onChange={(e) => setName(filterPersonName(e.target.value))}
          error={errors.name}
          autoComplete="name"
        />
        <AuthTextField
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
        />
        <AuthTextField
          label="Mobile number"
          name="phone"
          type="tel"
          placeholder="+923001234567"
          value={phone}
          inputMode="numeric"
          onChange={(e) => setPhone(filterDigits(e.target.value))}
          error={errors.phone}
          autoComplete="tel"
        />
        <div className="flex justify-end">
          <AuthSubmitButton loading={submitting}>Continue</AuthSubmitButton>
        </div>
      </form>
    </AuthShell>
  );
}
