import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

export const bookingService = {
  book: (payload) => api.post(endpoints.bookings.book, payload).then((r) => r.data),

  getMyTrips: () => api.get(endpoints.bookings.myTrips).then((r) => r.data),

  getIncomingRequests: () => api.get(endpoints.bookings.incoming).then((r) => r.data),

  getActiveCommitment: () =>
    api.get(endpoints.bookings.activeCommitment).then((r) => r.data),

  getFareQuote: (rideId, payload) =>
    api.post(endpoints.bookings.fareQuote(rideId), payload).then((r) => r.data),

  getHistory: (params = {}) =>
    api.get(endpoints.bookings.history, { params }).then((r) => r.data),

  getById: (id) => api.get(endpoints.bookings.byId(id)).then((r) => r.data),

  getLiveSeats: (rideId) =>
    api.get(endpoints.bookings.liveSeats(rideId)).then((r) => r.data),

  getLiveMap: (rideId) =>
    api.get(endpoints.bookings.liveMap(rideId)).then((r) => r.data),

  updateStatus: (bookingId, status) =>
    api.patch(endpoints.bookings.updateStatus(bookingId), { status }).then((r) => r.data),

  cancel: (bookingId, reason = '') =>
    api.patch(endpoints.bookings.cancel(bookingId), { reason }).then((r) => r.data),

  prepareRefund: (bookingId, reason = '') =>
    api.post(endpoints.bookings.prepareRefund(bookingId), { reason }).then((r) => r.data),

  completeRide: (rideId) =>
    api.post(endpoints.bookings.completeRide(rideId)).then((r) => r.data)
};
