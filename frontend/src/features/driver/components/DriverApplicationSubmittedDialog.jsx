import AppButton from '@/components/common/AppButton';

export default function DriverApplicationSubmittedDialog({ open, onContinue }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-brand-500/20"
        role="dialog"
        aria-labelledby="driver-app-title"
        aria-modal="true"
      >
        <div className="h-12 w-12 rounded-full bg-brand-500/15 flex items-center justify-center text-2xl mb-4">
          ✓
        </div>
        <h2 id="driver-app-title" className="text-xl font-extrabold text-white">
          Application submitted
        </h2>
        <p className="text-sm text-white/75 mt-3 leading-relaxed">
          Your driver documents have been received. Our team will review your request within{' '}
          <strong className="text-white">2–4 business days</strong>. You will be notified by email
          once a decision is made.
        </p>
        <p className="text-xs text-brand-300/90 mt-3 bg-brand-500/10 border border-brand-500/20 rounded-lg px-3 py-2">
          You are now in <strong>Passenger</strong> mode. You can book rides while you wait. Switch to
          Driver in the menu after approval.
        </p>
        <AppButton type="button" className="w-full mt-6" onClick={onContinue}>
          Continue as passenger
        </AppButton>
      </div>
    </div>
  );
}
