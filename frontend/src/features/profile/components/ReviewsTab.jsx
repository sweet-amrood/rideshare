import { Star } from 'lucide-react';

export default function ReviewsTab({ reviews = [], rating }) {
  return (
    <div className="space-y-4">
      <div className="glass-panel p-6 rounded-2xl flex items-center gap-6">
        <div className="text-center">
          <div className="text-4xl font-extrabold text-white">{rating?.average?.toFixed(1) || '5.0'}</div>
          <div className="flex justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${s <= Math.round(rating?.average || 5) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`}
              />
            ))}
          </div>
          <p className="text-xs text-white/70 mt-1">{rating?.count || 0} reviews</p>
        </div>
        <p className="text-sm text-white/80 flex-1">
          Reviews are left after completed carpools and on-demand rides. Trusted Rider badge unlocks with strong ratings plus verification.
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-white/80 text-sm">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r._id} className="glass-panel p-4 rounded-xl border border-slateCustom-700/50">
              <div className="flex justify-between items-start gap-2">
                <div className="font-bold text-white text-sm">{r.reviewerId?.name || 'Commuter'}</div>
                <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                  <Star className="h-4 w-4 fill-amber-400" />
                  {r.rating}
                </div>
              </div>
              {r.comment && <p className="text-sm text-white/85 mt-2">{r.comment}</p>}
              <p className="text-[10px] text-white/50 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
