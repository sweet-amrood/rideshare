import { Car, Star, MapPin } from 'lucide-react';
import { MATCH_LABELS } from '../constants';
import AppButton from '@/components/common/AppButton';

export default function NearbyRidesList({ rides = [], loading, onSelectRide, onBook }) {
  if (loading) {
    return <p className="text-sm text-white/70 p-4">Finding nearby carpools...</p>;
  }

  if (!rides.length) {
    return (
      <div className="p-6 text-center text-sm text-white/75">
        No carpools match this route yet. Try a different pickup or time.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slateCustom-800 max-h-[50vh] overflow-y-auto">
      {rides.map((item) => {
        const ride = item.ride;
        const label = MATCH_LABELS[item.matchLabel] || MATCH_LABELS.GOOD_MATCH;
        const driver = ride?.driverId;

        return (
          <li key={ride._id} className="p-4 hover:bg-slateCustom-800/30 transition-colors">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-brand-400" />
                  {driver?.name || 'Driver'}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-0.5">
                  <Star className="h-3 w-3 fill-amber-400" />
                  {driver?.rating?.average?.toFixed(1) || '5.0'}
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase ${label.color}`}>{label.text}</span>
            </div>

            <p className="text-xs text-white/80 mt-2 line-clamp-2">
              <MapPin className="inline h-3 w-3 mr-0.5 text-brand-400" />
              {ride.origin?.address} → {ride.destination?.address}
            </p>

            <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-white/60">
              <span>Pickup ~{(item.pickupDeviationMeters / 1000).toFixed(1)} km away</span>
              {item.etaToPickup?.text && <span>• {item.etaToPickup.text} to pickup</span>}
              <span>• Rs. {ride.costPerSeat}/seat</span>
              <span>• {ride.availableSeats} seats</span>
            </div>

            <div className="flex gap-2 mt-3">
              <AppButton type="button" className="!py-1.5 !px-3 !text-xs" onClick={() => onSelectRide?.(item)}>
                Show on map
              </AppButton>
              {onBook && (
                <button
                  type="button"
                  onClick={() => onBook(ride)}
                  className="text-xs font-semibold text-brand-400 border-0 bg-transparent outline-none"
                >
                  Book
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
