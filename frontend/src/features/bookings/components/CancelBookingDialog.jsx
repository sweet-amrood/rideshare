import { useState } from 'react';
import { XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import AppButton from '@/components/common/AppButton';
import { bookingService } from '@/api/services/booking.service';

export default function CancelBookingDialog({ booking, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await bookingService.cancel(booking._id, reason);
      toast.success(res.message || 'Booking cancelled');
      onCancelled?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    } finally {
      setLoading(false);
    }
  };

  const mayRefund =
    booking.paymentStatus === 'PAID' || booking.status === 'CONFIRMED';

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel max-w-sm w-full p-5 rounded-2xl space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-400" />
          Cancel booking?
        </h3>
        <p className="text-sm text-white/70">
          Ref: <strong className="text-white">{booking.bookingRef || booking._id}</strong>
        </p>
        {mayRefund && (
          <p className="text-xs text-purple-300">
            A refund may be prepared automatically if payment was recorded.
          </p>
        )}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          rows={2}
          className="w-full bg-slateCustom-800 border border-slateCustom-600 rounded-lg px-3 py-2 text-white text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slateCustom-600 text-white/80 text-sm"
          >
            Keep
          </button>
          <AppButton
            type="button"
            disabled={loading}
            onClick={handleCancel}
            className="flex-1 !bg-red-600 hover:!bg-red-500 border-0"
          >
            {loading ? 'Cancelling…' : 'Cancel booking'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
