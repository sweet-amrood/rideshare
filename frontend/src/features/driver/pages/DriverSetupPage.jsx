import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { persistCommuterRole } from '@/utils/commuterRole';
import CommuterRoleToggle from '@/components/layout/CommuterRoleToggle';
import AppButton from '@/components/common/AppButton';
import DriverSetupWizard from '../components/DriverSetupWizard';
import DriverApplicationSubmittedDialog from '../components/DriverApplicationSubmittedDialog';
import { useDriverApplicationFlow } from '../hooks/useDriverApplicationFlow';
import { paths } from '@/app/router/paths';

export default function DriverSetupPage() {
  const navigate = useNavigate();
  const { user, setUser, completeOnboarding } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const { showSubmittedDialog, handleDriverSetupComplete, dismissSubmittedDialog } =
    useDriverApplicationFlow({ setUser, completeOnboarding });

  const switchToPassenger = async () => {
    setLeaving(true);
    try {
      const u = await persistCommuterRole('RIDER');
      if (u) {
        setUser({
          roles: u.roles,
          driverSetupComplete: u.driverSetupComplete,
          driverAvailability: u.driverAvailability
        });
      }
      toast.success('Passenger mode — driver setup skipped for now');
      navigate(paths.find, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not switch to passenger');
    } finally {
      setLeaving(false);
    }
  };

  if (!user?._id) {
    return (
      <div className="min-h-screen bg-slateCustom-900 flex items-center justify-center text-white/70 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slateCustom-900 bg-grid flex flex-col">
      <DriverApplicationSubmittedDialog
        open={showSubmittedDialog}
        onContinue={dismissSubmittedDialog}
      />
      <header className="shrink-0 border-b border-slateCustom-800 glass-panel px-4 py-4 sm:px-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={switchToPassenger}
              disabled={leaving}
              className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to passenger
            </button>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/45 mb-2">
              Commuter mode
            </p>
            <CommuterRoleToggle onRoleChange={(u) => u?.roles?.includes('RIDER') && navigate(paths.find, { replace: true })} />
          </div>
          <p className="text-xs text-white/55">
            Only need to book rides? Switch to <strong className="text-brand-300">Passenger</strong> above
            or use the button below — you can become a driver later.
          </p>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 sm:p-10 shadow-2xl my-4">
          <DriverSetupWizard
            userId={user?._id}
            title="Complete driver profile"
            subtitle="Required to offer rides. Skip this if you only want to book as a passenger."
            onComplete={handleDriverSetupComplete}
            onCancel={switchToPassenger}
            showCancel
            cancelLabel="Continue as passenger only"
          />
        </div>
      </div>

      <footer className="shrink-0 p-4 sm:p-6 border-t border-slateCustom-800/80">
        <div className="max-w-2xl mx-auto">
          <AppButton
            type="button"
            variant="secondary"
            className="w-full"
            disabled={leaving}
            onClick={switchToPassenger}
          >
            {leaving ? 'Switching…' : 'Continue as passenger only'}
          </AppButton>
        </div>
      </footer>
    </div>
  );
}
