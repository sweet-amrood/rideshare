import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

export const mapsService = {
  bootstrap: () => api.get(endpoints.maps.bootstrap).then((r) => r.data),

  autocomplete: (params) =>
    api.get(endpoints.maps.autocomplete, { params }).then((r) => r.data),

  placeDetails: (params) =>
    api.get(endpoints.maps.placeDetails, { params }).then((r) => r.data),

  reverseGeocode: (params) =>
    api.get(endpoints.maps.reverseGeocode, { params }).then((r) => r.data),

  directions: (body) => api.post(endpoints.maps.directions, body).then((r) => r.data),

  distanceMatrix: (body) => api.post(endpoints.maps.distanceMatrix, body).then((r) => r.data),

  nearbyRides: (body) => api.post(endpoints.maps.nearbyRides, body).then((r) => r.data),

  routeSuggestions: (body) => api.post(endpoints.maps.routeSuggestions, body).then((r) => r.data)
};
