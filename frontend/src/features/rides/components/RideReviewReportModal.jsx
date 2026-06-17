import { useState } from 'react';
import toast from 'react-hot-toast';
import { Star, Flag, X, MessageSquare, Sparkles } from 'lucide-react';
import AppButton from '@/components/common/AppButton';
import { rideRequestService } from '@/api/services/rideRequest.service';

const REPORT_CATEGORIES = [
  { value: 'UNSAFE_DRIVING', label: 'Unsafe driving' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'SCAM', label: 'Scam / fare issue' },
  { value: 'INAPPROPRIATE_BEHAVIOR', label: 'Inappropriate behavior' },
  { value: 'FAKE_PROFILE', label: 'Fake profile' },
  { value: 'OTHER', label: 'Other' }
];

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function RideReviewReportModal({ rideRequestId, otherPartyName, onDone }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const displayRating = hoverRating || rating;

  const submit = async () => {
    setBusy(true);
    try {
      await rideRequestService.submitReview(rideRequestId, { rating, comment });
      if (showReport && description.trim()) {
        await rideRequestService.submitReport(rideRequestId, { category, description });
        toast.success('Review and report submitted');
      } else {
        toast.success('Thank you for your review');
      }
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-emerald-500/35 bg-gradient-to-b from-[#0a1628] via-[#061210] to-black shadow-2xl shadow-emerald-900/30"
        role="dialog"
        aria-labelledby="review-title"
      >
        <div className="h-1.5 w-12 rounded-full bg-emerald-400/50 mx-auto mt-3 sm:hidden" />

        <button
          type="button"
          onClick={() => onDone?.()}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/40 bg-[#0a2818] text-white hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 stroke-[2.5]" />
        </button>

        <div className="px-6 pt-8 pb-2 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-4">
            <Sparkles className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 id="review-title" className="text-2xl font-extrabold text-white tracking-tight">
            Rate your trip
          </h2>
          <p className="text-sm text-emerald-100/80 mt-2 max-w-xs mx-auto">
            How was your ride with{' '}
            <span className="text-emerald-300 font-semibold">{otherPartyName || 'your driver'}</span>?
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1.5 transition-transform hover:scale-110 active:scale-95"
                aria-label={`${n} stars`}
              >
                <Star
                  className={`h-10 w-10 sm:h-11 sm:w-11 transition-colors ${
                    n <= displayRating
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : 'fill-[#0a2818] stroke-emerald-400/70 text-emerald-400/70'
                  }`}
                  strokeWidth={n <= displayRating ? 0 : 1.5}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm font-semibold text-amber-300/90 mt-2 min-h-[1.25rem]">
            {RATING_LABELS[displayRating] || ''}
          </p>
        </div>

        <div className="px-6 pb-4 space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 flex items-center gap-1.5 mb-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Optional note
            </span>
            <textarea
              placeholder="Share what went well or what could improve…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full bg-black/50 border border-emerald-500/25 rounded-xl px-4 py-3 text-white text-sm placeholder:text-emerald-200/35 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
            />
            <span className="text-[10px] text-emerald-300/50 mt-1 block text-right">{comment.length}/500</span>
          </label>

          <button
            type="button"
            onClick={() => setShowReport((s) => !s)}
            className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
              showReport
                ? 'border-red-500/40 bg-red-950/40 text-red-200'
                : 'border-emerald-500/20 bg-black/40 text-emerald-100/90 hover:border-red-500/35 hover:bg-red-950/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Report a safety issue
            </span>
            <span className={`text-xs font-bold ${showReport ? 'text-red-300' : 'text-emerald-400'}`}>
              {showReport ? '−' : '+'}
            </span>
          </button>

          {showReport && (
            <div className="space-y-3 p-4 rounded-xl border border-red-500/25 bg-black/50">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="review-modal-select w-full appearance-none rounded-lg border border-red-500/35 bg-[#0a2818] px-3 py-2.5 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 [color-scheme:dark]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2334d399' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center'
                }}
              >
                {REPORT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#061210] text-white">
                    {c.label}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Describe the incident (required to submit a report)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-black/60 border border-red-500/25 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>
          )}
        </div>

        <div className="px-6 pb-8 pt-2 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-gradient-to-t from-black via-[#061210] to-transparent">
          <AppButton type="button" disabled={busy} onClick={submit} className="sm:flex-1 order-1">
            {busy ? 'Submitting…' : 'Submit rating'}
          </AppButton>
          <button
            type="button"
            onClick={() => onDone?.()}
            disabled={busy}
            className="sm:flex-none px-6 py-3 rounded-lg text-sm font-semibold text-emerald-200/80 hover:text-white border border-emerald-500/25 hover:border-emerald-400/50 bg-black/30 transition-colors order-2"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
