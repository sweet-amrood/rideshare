import { paths } from '@/app/router/paths';

/** Resolve in-app navigation target for a notification. */
export function getNotificationPath(notification) {
  const type = notification?.type;
  const data = notification?.data || {};
  const rideId = data.rideId;
  const requestId = data.requestId;

  switch (type) {
    case 'BOOKING_REQUESTED':
      return paths.offer;
    case 'BOOKING_CONFIRMED':
    case 'RIDE_STARTED':
      return rideId ? paths.chat(rideId) : paths.bookings;
    case 'BOOKING_REJECTED':
    case 'BOOKING_CANCELLED':
    case 'REFUND_PREPARED':
    case 'RIDE_COMPLETED':
      return paths.bookings;
    case 'RIDE_REQUEST_NEW':
      return paths.offer;
    case 'RIDE_REQUEST_FARE_OFFER':
    case 'RIDE_REQUEST_MATCHED':
    case 'RIDE_REQUEST_STARTED':
      return requestId ? paths.rideRequestChat(requestId) : paths.find;
    case 'RIDE_REQUEST_CANCELLED':
    case 'RIDE_REQUEST_COMPLETED':
      return requestId ? paths.rideRequestChat(requestId) : paths.find;
    default:
      return paths.dashboard;
  }
}

export function notificationIconType(type) {
  if (type?.includes('CANCEL')) return 'cancel';
  if (type?.includes('STARTED') || type === 'RIDE_STARTED') return 'start';
  if (type?.includes('COMPLETED') || type === 'RIDE_COMPLETED') return 'complete';
  if (type?.includes('REQUESTED') || type === 'RIDE_REQUEST_NEW') return 'new';
  if (type?.includes('CONFIRMED') || type?.includes('MATCHED')) return 'confirm';
  return 'info';
}

export function formatNotificationTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}
