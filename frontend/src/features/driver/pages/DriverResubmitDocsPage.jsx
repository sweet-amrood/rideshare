import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DriverSetupWizard from '../components/DriverSetupWizard';

export default function DriverResubmitDocsPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const handleComplete = (data) => {
    const verification = data?.user?.verification || data?.verification;
    if (verification) setUser({ verification });
    navigate('/profile', { state: { tab: 'verification' }, replace: true });
  };

  return (
    <div className="min-h-screen bg-slateCustom-900 bg-grid flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 sm:p-10 shadow-2xl">
        <DriverSetupWizard
          userId={user?._id}
          documentsOnly
          title="Re-upload verification documents"
          subtitle="Replace any rejected CNIC, selfie, or license files. Your profile will return to pending review."
          onComplete={handleComplete}
          onCancel={() => navigate('/profile')}
          showCancel
        />
      </div>
    </div>
  );
}
