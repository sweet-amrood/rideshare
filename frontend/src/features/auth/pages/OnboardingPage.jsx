import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Button from '@mui/material/Button';
import {
  HiOutlineUserGroup,
  HiOutlineTruck,
  HiOutlineArrowRight,
  HiOutlineCheckCircle
} from 'react-icons/hi';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { completeOnboarding, updateUser } from '@/store/slices/authSlice';
import { profileService } from '@/api/services/profile.service';
import { getDefaultHomePath } from '@/utils/roles';
import DriverSetupWizard from '@/features/driver/components/DriverSetupWizard';
import DriverApplicationSubmittedDialog from '@/features/driver/components/DriverApplicationSubmittedDialog';
import { useDriverApplicationFlow } from '@/features/driver/hooks/useDriverApplicationFlow';

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.3 }
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, onboardingComplete, setUser, completeOnboarding: markOnboarding } = useAuth();

  const [step, setStep] = useState(0);
  const [commuterType, setCommuterType] = useState('RIDER');
  const [loading, setLoading] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);

  const persistOnboardingComplete = async () => {
    try {
      await profileService.updateProfile({ onboardingComplete: true });
    } catch {
      /* local state still updated */
    }
    markOnboarding();
    dispatch(completeOnboarding());
  };

  const { showSubmittedDialog, handleDriverSetupComplete, dismissSubmittedDialog } =
    useDriverApplicationFlow({
      setUser,
      completeOnboarding: persistOnboardingComplete
    });

  const isDriverFlow = commuterType === 'DRIVER';
  const totalSteps = isDriverFlow ? 3 : 2;

  useEffect(() => {
    if (onboardingComplete && !showSubmittedDialog) {
      const onlyPassenger = !user?.roles?.includes('DRIVER') || user?.driverApplicant;
      const driverApproved =
        user?.roles?.includes('DRIVER') && user?.driverSetupComplete === true;
      if (onlyPassenger || driverApproved) {
        navigate(getDefaultHomePath(user?.roles), { replace: true });
      }
    }
  }, [onboardingComplete, user, navigate, showSubmittedDialog]);

  const saveRoles = async () => {
    const roles = [commuterType];
    await profileService.updateProfile({ roles });
    dispatch(updateUser({ roles }));
    setRolesSaved(true);
    return roles;
  };

  const finishPassenger = async () => {
    setLoading(true);
    try {
      const roles = await saveRoles();
      await persistOnboardingComplete();
      toast.success('You are all set!');
      navigate(getDefaultHomePath(roles), { replace: true });
    } catch {
      dispatch(updateUser({ roles: [commuterType] }));
      await persistOnboardingComplete();
      navigate(getDefaultHomePath([commuterType]), { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleNext = async () => {
    if (!isDriverFlow) {
      await finishPassenger();
      return;
    }
    setLoading(true);
    try {
      await saveRoles();
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slateCustom-900 bg-grid flex items-center justify-center p-4 sm:p-8">
      <DriverApplicationSubmittedDialog
        open={showSubmittedDialog}
        onContinue={dismissSubmittedDialog}
      />
      <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Onboarding</p>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Hi, {user?.name?.split(' ')[0] || 'Commuter'}!
            </h1>
          </div>
          <span className="text-sm text-slate-400">
            Step {step + 1} / {totalSteps}
          </span>
        </div>

        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-brand-500' : 'bg-slateCustom-700'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" {...slide} className="space-y-6 text-center">
              <HiOutlineCheckCircle className="h-16 w-16 text-brand-400 mx-auto" />
              <p className="text-slate-300 leading-relaxed max-w-md mx-auto">
                Pick <strong className="text-white">Passenger</strong> to book rides, or{' '}
                <strong className="text-white">Driver</strong> to offer car, bike, or rickshaw
                carpools (verification required). You can switch roles later in Profile.
              </p>
              <Button
                variant="contained"
                size="large"
                endIcon={<HiOutlineArrowRight />}
                onClick={() => setStep(1)}
                sx={{ px: 4, py: 1.25 }}
              >
                Get started
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" {...slide} className="space-y-6">
              <p className="text-slate-400 text-sm text-center">How will you use Ride Share?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {[
                  {
                    id: 'RIDER',
                    label: 'Passenger',
                    hint: 'Book carpools — quick setup',
                    icon: HiOutlineUserGroup
                  },
                  {
                    id: 'DRIVER',
                    label: 'Driver',
                    hint: 'Car, bike, or rickshaw + ID verify',
                    icon: HiOutlineTruck
                  }
                ].map(({ id, label, hint, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCommuterType(id)}
                    className={`choice-btn p-5 rounded-xl border text-left transition-all outline-none cursor-pointer ${
                      commuterType === id
                        ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                        : 'border-slateCustom-700/80 bg-transparent hover:border-brand-500/50 hover:bg-brand-500/5'
                    }`}
                  >
                    <Icon
                      className={`h-8 w-8 mb-2 ${commuterType === id ? 'text-brand-400' : 'text-white/50'}`}
                    />
                    <div className="font-bold text-white">{label}</div>
                    <p className="text-[10px] text-white/55 mt-1">{hint}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-between pt-2">
                <Button variant="text" onClick={() => setStep(0)} sx={{ color: '#94a3b8' }}>
                  Back
                </Button>
                <Button variant="contained" disabled={loading} onClick={handleRoleNext}>
                  {loading
                    ? 'Saving…'
                    : isDriverFlow
                      ? 'Continue — ride & documents'
                      : 'Finish'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && isDriverFlow && (
            <motion.div key="s2" {...slide}>
              <DriverSetupWizard
                userId={user?._id}
                title="Your ride & verification"
                subtitle="Select car, bike, or rickshaw, company name, then upload CNIC, selfie, and license."
                onComplete={handleDriverSetupComplete}
                onCancel={() => setStep(1)}
                showCancel={!rolesSaved}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
