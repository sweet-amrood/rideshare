import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { finishDriverApplicationAsPassenger } from '../utils/finishDriverApplication';

/**
 * Shared post-submit flow: passenger mode + success dialog + navigate to book rides.
 */
export function useDriverApplicationFlow({ setUser, completeOnboarding }) {
  const navigate = useNavigate();
  const [showSubmittedDialog, setShowSubmittedDialog] = useState(false);

  const handleDriverSetupComplete = useCallback(
    async (data) => {
      await finishDriverApplicationAsPassenger({ setUser, data });
      completeOnboarding?.();
      setShowSubmittedDialog(true);
    },
    [setUser, completeOnboarding]
  );

  const dismissSubmittedDialog = useCallback(() => {
    setShowSubmittedDialog(false);
    navigate('/find', { replace: true });
  }, [navigate]);

  return {
    showSubmittedDialog,
    handleDriverSetupComplete,
    dismissSubmittedDialog
  };
}
