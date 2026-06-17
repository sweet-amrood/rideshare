import { useCallback, useEffect, useState } from 'react';
import { Car, Loader2 } from 'lucide-react';
import { bookingService } from '@/api/services/booking.service';
import DriverCarpoolRideCard from '@/features/carpool/components/DriverCarpoolRideCard';

export default function DriverManageRides({ refreshKey = 0 }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingService.getMyTrips();
      const active = (res.data?.driverTrips || []).filter(
        (r) => r.status === 'SCHEDULED' || r.status === 'ACTIVE'
      );
      setRides(active);
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!rides.length) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border border-emerald-500/20">
        <Car className="h-10 w-10 text-emerald-400/40 mx-auto mb-3" />
        <p className="font-semibold text-white">No active published rides</p>
        <p className="text-sm text-white/55 mt-2">Publish a carpool above to receive booking requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {rides.map((ride) => (
        <DriverCarpoolRideCard key={ride._id} ride={ride} onRefresh={load} refreshKey={refreshKey} />
      ))}
    </div>
  );
}
