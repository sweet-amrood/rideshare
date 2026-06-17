import { useCallback, useEffect, useState } from 'react';
import { bookingService } from '@/api/services/booking.service';
import { rideRequestService } from '@/api/services/rideRequest.service';
import { activeCommuterRole } from '@/utils/commuterRole';
import { useAuth } from '@/hooks/useAuth';
import { useAppSocket } from '@/hooks/useAppSocket';
import { BOOKING_STATUS } from '@/features/bookings/constants';

/**
 * Unified active trip for passenger (on-demand + carpool) or driver on-demand.
 */
export function useActiveTrip({ asDriver = false, pollMs = 15000 } = {}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [commitment, setCommitment] = useState(null);
  const [onDemand, setOnDemand] = useState(null);

  const refresh = useCallback(async () => {
    if (!user?._id) {
      setCommitment(null);
      setOnDemand(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (asDriver) {
        const res = await rideRequestService.getCurrent();
        setOnDemand(res.success ? res.data : null);
        setCommitment(res.success && res.data ? { kind: 'RIDE_REQUEST', data: res.data } : null);
      } else {
        const [carpoolRes, onDemandRes] = await Promise.all([
          bookingService.getActiveCommitment(),
          rideRequestService.getActive()
        ]);
        const carpoolCommitment = carpoolRes?.data;
        const od = onDemandRes.success ? onDemandRes.data : null;
        setOnDemand(od);

        if (
          od &&
          ['SEARCHING', 'OFFERS_PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(
            od.status
          )
        ) {
          setCommitment({ kind: 'RIDE_REQUEST', data: od });
        } else if (carpoolCommitment?.kind === 'CARPOOL_BOOKING') {
          setCommitment(carpoolCommitment);
        } else if (od) {
          setCommitment({ kind: 'RIDE_REQUEST', data: od });
        } else {
          setCommitment(null);
        }
      }
    } catch {
      setCommitment(null);
    } finally {
      setLoading(false);
    }
  }, [user?._id, asDriver]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useAppSocket(
    !asDriver
      ? {
          'carpool-ride-completed': () => {
            refresh();
          },
          'booking-confirmed': () => refresh(),
          'booking-rejected': () => refresh()
        }
      : {}
  );

  useEffect(() => {
    if (asDriver || !pollMs) return undefined;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [asDriver, pollMs, refresh]);

  const role = activeCommuterRole(user?.roles);
  const isBusy =
    !!commitment &&
    ((commitment.kind === 'CARPOOL_BOOKING' &&
      ![BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(
        commitment.data?.status
      )) ||
      (commitment.kind === 'RIDE_REQUEST' &&
        ['SEARCHING', 'OFFERS_PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(
          commitment.data?.status
        )));

  return {
    loading,
    commitment,
    onDemand,
    isBusy,
    role,
    refresh
  };
}

export default useActiveTrip;
