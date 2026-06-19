import { Car } from 'lucide-react';
import OfferRideForm from '../components/OfferRideForm';

export default function OfferRidePage() {
  return (
    <div className="min-h-0 flex flex-col">
      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Car className="w-8 h-8 text-brand-600" />
          Offer a ride
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-xl">
          Set your route, seats, and preferences. Fare per seat is calculated from admin platform rates.
        </p>
      </header>
      <OfferRideForm />
    </div>
  );
}
