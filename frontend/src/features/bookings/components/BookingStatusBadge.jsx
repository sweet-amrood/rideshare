import { STATUS_LABELS, STATUS_STYLES } from '../constants';

export default function BookingStatusBadge({ status, paymentStatus }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.CANCELLED;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${style}`}>
        {STATUS_LABELS[status] || status}
      </span>
      {paymentStatus === 'REFUND_PENDING' && (
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/30">
          Refund pending
        </span>
      )}
      {paymentStatus === 'REFUNDED' && (
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/30">
          Refunded
        </span>
      )}
    </div>
  );
}
