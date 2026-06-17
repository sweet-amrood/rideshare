export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW'
};

export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED'
};

export const BOOKING_VEHICLE_TYPE = 'CAR';

export const BOOKING_MODES = {
  CARPOOL: 'CARPOOL',
  SOLO: 'SOLO'
};

export const BOOKING_MODE_LABELS = {
  CARPOOL: 'Carpool',
  SOLO: 'Solo (private car)'
};

export const STATUS_LABELS = {
  PENDING: 'Pending approval',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Declined',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No show'
};

export const STATUS_STYLES = {
  PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  CONFIRMED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30',
  CANCELLED: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  COMPLETED: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
  NO_SHOW: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
};

export const HISTORY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Declined' }
];
