import { useEffect, useState } from 'react';
import api from '@/api/axios';

const VEHICLE_TYPES = ['CAR', 'BIKE', 'RICKSHAW'];
const VEHICLE_FIELDS = [
  {
    key: 'perKmRate',
    label: 'Rate per km (PKR)',
    hint: 'Trip fare = rate × distance (e.g. 25 × 7 km = 175)'
  },
  {
    key: 'baseFare',
    label: 'Minimum fare floor (PKR)',
    hint: 'Optional; 0 = no minimum. Final fare is max(rate × km × surcharges, floor)'
  },
  { key: 'passengerMinDiscountPercent', label: 'Passenger max discount %' },
  { key: 'driverMaxIncreasePercent', label: 'Driver max increase %' }
];

const GLOBAL_FIELDS = [
  { key: 'nightMultiplier', label: 'Night multiplier' },
  { key: 'nightStartHour', label: 'Night starts (hour)' },
  { key: 'nightEndHour', label: 'Night ends (hour)' },
  { key: 'driverNotifyRadiusMeters', label: 'Driver notify radius (m)' },
  { key: 'avgSpeedKmh', label: 'Avg speed for ETA (km/h)' }
];

const defaultVehicleRate = (vt) => ({
  perKmRate: vt === 'CAR' ? 45 : vt === 'BIKE' ? 25 : 22,
  baseFare: 0,
  passengerMinDiscountPercent: 13,
  driverMaxIncreasePercent: 25
});

export default function FareSettingsPage() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api
      .get('/admin/settings/fare')
      .then((r) => {
        if (r.data.success) {
          const d = r.data.data;
          const vehicleRates = { CAR: {}, BIKE: {}, RICKSHAW: {} };
          VEHICLE_TYPES.forEach((vt) => {
            const stored = d.vehicleRates?.[vt] || {};
            vehicleRates[vt] = { ...defaultVehicleRate(vt), ...stored };
            if (!stored.perKmRate && stored.baseFare > 0) {
              vehicleRates[vt].perKmRate = stored.baseFare;
            }
          });
          setForm({ ...d, vehicleRates });
        }
      })
      .catch((err) => {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load settings' });
      });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        currency: form.currency,
        nightMultiplier: form.nightMultiplier,
        nightStartHour: form.nightStartHour,
        nightEndHour: form.nightEndHour,
        driverNotifyRadiusMeters: form.driverNotifyRadiusMeters,
        avgSpeedKmh: form.avgSpeedKmh,
        vehicleRates: form.vehicleRates
      };
      const r = await api.patch('/admin/settings/fare', payload);
      if (r.data.success) {
        setForm(r.data.data);
        setMessage({ type: 'success', text: 'Fare factors saved' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const setVehicleField = (vt, key, value) => {
    setForm((f) => ({
      ...f,
      vehicleRates: {
        ...f.vehicleRates,
        [vt]: { ...f.vehicleRates[vt], [key]: value === '' ? '' : Number(value) }
      }
    }));
  };

  if (!form) {
    return <p className="text-slate-400 p-6">Loading fare settings…</p>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Fare factors</h1>
        <p className="text-sm text-slate-400 mt-1">
          Fare = rate per km × trip distance × surcharges (night / peak). Example: bike rate 25, 7 km → 25 × 7 = 175 PKR
          before night or peak multipliers.
        </p>
      </div>

      {message && (
        <p
          className={`text-sm px-4 py-2 rounded-lg border ${
            message.type === 'success'
              ? 'text-green-300 bg-green-950/40 border-green-500/30'
              : 'text-red-300 bg-red-950/40 border-red-500/30'
          }`}
        >
          {message.text}
        </p>
      )}

      <form onSubmit={save} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-8">
        {VEHICLE_TYPES.map((vt) => (
          <section key={vt} className="border-b border-slate-800 pb-6 last:border-0">
            <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4">{vt}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VEHICLE_FIELDS.map(({ key, label, hint }) => (
                <label key={key} className="block">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                  {hint && <span className="block text-[10px] text-slate-500 mt-0.5 normal-case">{hint}</span>}
                  <input
                    type="number"
                    step="any"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    value={form.vehicleRates?.[vt]?.[key] ?? ''}
                    onChange={(e) => setVehicleField(vt, key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Global</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GLOBAL_FIELDS.map(({ key, label }) => (
              <label key={key} className="block">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                <input
                  type="number"
                  step="any"
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  value={form[key] ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [key]: e.target.value === '' ? '' : Number(e.target.value)
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save factors'}
        </button>
      </form>
    </div>
  );
}
