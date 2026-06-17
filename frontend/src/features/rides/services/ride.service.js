import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

export async function offerRide(payload) {
  const { data } = await api.post(endpoints.rides.offer, payload);
  return data;
}

export async function estimateRidePrice(payload) {
  const { data } = await api.post(endpoints.rides.estimatePrice, payload);
  return data.pricing;
}

export async function searchRides(payload) {
  const { data } = await api.post(endpoints.rides.search, payload);
  return data;
}

export async function getMyOffers(status) {
  const { data } = await api.get(endpoints.rides.myOffers, {
    params: status ? { status } : {}
  });
  return data;
}

export async function getRideById(id) {
  const { data } = await api.get(endpoints.rides.byId(id));
  return data;
}

export async function cancelRide(id, cancelSeries = false) {
  const { data } = await api.delete(endpoints.rides.cancel(id), {
    params: cancelSeries ? { series: 'true' } : {}
  });
  return data;
}
