import api from '@/api/axios';

const base = '/ride-requests';

export const rideRequestService = {
  getActive: () => api.get(`${base}/active`).then((r) => r.data),
  getHistory: (params) => api.get(`${base}/history`, { params }).then((r) => r.data),
  getCurrent: () => api.get(`${base}/current`).then((r) => r.data),
  getChat: (id) => api.get(`${base}/${id}/chat`).then((r) => r.data),
  sendChat: (id, message) => api.post(`${base}/${id}/chat`, { message }).then((r) => r.data),
  markChatRead: (id) => api.post(`${base}/${id}/chat/read`).then((r) => r.data),
  updateLocation: (id, body) => api.patch(`${base}/${id}/location`, body).then((r) => r.data),
  pingHere: (id) => api.post(`${base}/${id}/ping-here`).then((r) => r.data),
  startRide: (id) => api.post(`${base}/${id}/start`).then((r) => r.data),
  completeRide: (id) => api.post(`${base}/${id}/complete`).then((r) => r.data),
  dismissRide: (id) => api.post(`${base}/${id}/dismiss`).then((r) => r.data),
  cancelRide: (id, body) => api.post(`${base}/${id}/cancel`, body || {}).then((r) => r.data),
  updateFare: (id, fare) => api.patch(`${base}/${id}/fare`, { fare }).then((r) => r.data),
  estimateFare: (body) => api.post(`${base}/estimate`, body).then((r) => r.data),
  create: (body) => api.post(base, body).then((r) => r.data),
  get: (id) => api.get(`${base}/${id}`).then((r) => r.data),
  expandWave: (id, radiusMeters) =>
    api.post(`${base}/${id}/expand-wave`, { radiusMeters }).then((r) => r.data),
  updateSearchFare: (id, passengerOfferedFare) =>
    api.patch(`${base}/${id}/search-fare`, { passengerOfferedFare }).then((r) => r.data),
  listIncoming: () => api.get(`${base}/incoming`).then((r) => r.data),
  driverRespond: (id, body) => api.patch(`${base}/${id}/respond`, body).then((r) => r.data),
  passengerRespondOffer: (id, offerId, body) =>
    api.patch(`${base}/${id}/offers/${offerId}/respond`, body).then((r) => r.data),
  submitReview: (id, body) => api.post(`${base}/${id}/review`, body).then((r) => r.data),
  submitReport: (id, body) => api.post(`${base}/${id}/report`, body).then((r) => r.data)
};
