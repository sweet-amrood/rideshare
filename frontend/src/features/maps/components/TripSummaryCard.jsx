import { Route, Clock, Navigation } from 'lucide-react';

export default function TripSummaryCard({ route, loading, error }) {
  if (loading) {
    return (
      <div className="text-xs text-white/70 animate-pulse">Calculating route...</div>
    );
  }

  if (error) {
    return <div className="text-xs text-red-400">{error}</div>;
  }

  if (!route) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2 text-sm text-white">
        <Route className="h-4 w-4 text-brand-400 shrink-0" />
        <span>{route.distance?.text || '—'}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-white">
        <Clock className="h-4 w-4 text-brand-400 shrink-0" />
        <span>{route.durationInTraffic?.text || route.duration?.text || '—'} ETA</span>
      </div>
      {route.summary && (
        <p className="col-span-2 text-[11px] text-white/65 flex items-start gap-1">
          <Navigation className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          via {route.summary}
        </p>
      )}
    </div>
  );
}
