import { Lightbulb } from 'lucide-react';

export default function RouteOptimizationTips({ tips = [] }) {
  if (!tips.length) return null;

  return (
    <div className="space-y-2 mt-3">
      {tips.map((tip, i) => (
        <div
          key={i}
          className="flex gap-2 text-[11px] text-white/80 bg-brand-500/10 border border-brand-500/20 rounded-lg px-3 py-2"
        >
          <Lightbulb className="h-3.5 w-3.5 text-brand-400 shrink-0" />
          {tip.message}
        </div>
      ))}
    </div>
  );
}
