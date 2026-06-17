import { useEffect, useMemo, useState } from 'react';
import { Car, Plus, Upload, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import AppButton from '@/components/common/AppButton';
import { vehicleService } from '@/api/services/vehicle.service';
import {
  VEHICLE_TYPES,
  COMPANIES_BY_TYPE,
  MODEL_HINTS,
  getDefaultSeats,
  getPlateLabel
} from '@/features/driver/constants/vehicleCatalog';

const labelClass = 'text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1';
const inputClass =
  'w-full bg-slateCustom-800 border border-slateCustom-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50';

export default function VehiclesTab({ vehicles: initial = [], onRefresh }) {
  const [vehicles, setVehicles] = useState(initial);
  const [vehicleType, setVehicleType] = useState('CAR');
  const [company, setCompany] = useState('');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState(String(new Date().getFullYear()));
  const [vColor, setVColor] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vSeats, setVSeats] = useState(4);
  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  const [registrationFile, setRegistrationFile] = useState(null);
  const [vLoading, setVLoading] = useState(false);
  const [vSuccess, setVSuccess] = useState('');
  const [vError, setVError] = useState('');

  const companies = useMemo(
    () => COMPANIES_BY_TYPE[vehicleType] || COMPANIES_BY_TYPE.CAR,
    [vehicleType]
  );

  useEffect(() => {
    setVehicles(initial);
  }, [initial]);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!vehiclePhotos.length) {
      toast.error('Add at least one vehicle photo');
      return;
    }
    if (!registrationFile) {
      toast.error('Attach registration card or papers');
      return;
    }

    setVLoading(true);
    setVError('');
    setVSuccess('');
    try {
      const mediaRes = await vehicleService.uploadVehicleMedia({
        photos: vehiclePhotos,
        registration: registrationFile
      });
      const media = mediaRes.data || {};

      const { data: resData } = await api.post(endpoints.users.vehicle, {
        vehicleType,
        company,
        make: company,
        model: vModel,
        year: parseInt(vYear, 10),
        color: vColor,
        licensePlate: vPlate,
        totalSeats: parseInt(vSeats, 10),
        photoUrls: media.photoUrls,
        photoPublicIds: media.photoPublicIds,
        registrationDocUrl: media.registrationDocUrl,
        registrationDocPublicId: media.registrationDocPublicId,
        imageUrl: media.imageUrl
      });

      if (resData.success) {
        setVSuccess('Vehicle registered — pending admin review.');
        setCompany('');
        setVModel('');
        setVYear(String(new Date().getFullYear()));
        setVColor('');
        setVPlate('');
        setVSeats(getDefaultSeats(vehicleType));
        setVehiclePhotos([]);
        setRegistrationFile(null);
        onRefresh?.();
      } else throw new Error(resData.message);
    } catch (err) {
      setVError(err.response?.data?.message || err.message);
    } finally {
      setVLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1 glass-panel p-6 rounded-2xl h-fit space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-400" />
          Register a vehicle
        </h3>
        {vError && <div className="text-xs text-red-400">{vError}</div>}
        {vSuccess && <div className="text-xs text-green-400">{vSuccess}</div>}
        <form onSubmit={handleAddVehicle} className="space-y-3">
          <div>
            <label className={labelClass}>Ride type</label>
            <select
              value={vehicleType}
              onChange={(e) => {
                setVehicleType(e.target.value);
                setCompany('');
                setVSeats(getDefaultSeats(e.target.value));
              }}
              className={inputClass}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Company / brand</label>
            <select
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClass}
            >
              <option value="">Select</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <input
              required
              value={vModel}
              onChange={(e) => setVModel(e.target.value)}
              placeholder={MODEL_HINTS[vehicleType]}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Year</label>
              <input
                type="number"
                required
                value={vYear}
                onChange={(e) => setVYear(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Color</label>
              <input required value={vColor} onChange={(e) => setVColor(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{getPlateLabel(vehicleType)}</label>
            <input required value={vPlate} onChange={(e) => setVPlate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Passenger seats</label>
            <input
              type="number"
              min={1}
              max={vehicleType === 'BIKE' ? 1 : 6}
              required
              value={vSeats}
              onChange={(e) => setVSeats(parseInt(e.target.value, 10) || 1)}
              className={inputClass}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slateCustom-700">
            <label className={labelClass}>Vehicle photos (1–4)</label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-300">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={vLoading}
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []).slice(0, 4);
                  setVehiclePhotos(picked);
                  if (picked.length) toast.success(`${picked.length} photo(s) attached`);
                  e.target.value = '';
                }}
              />
              <span className="text-white/90">
                {vehiclePhotos.length ? `${vehiclePhotos.length} selected` : 'Choose photos'}
              </span>
            </label>
            <label className={labelClass}>Registration card / papers</label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-300">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={vLoading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setRegistrationFile(f);
                    toast.success('Registration attached');
                  }
                  e.target.value = '';
                }}
              />
              <span className="truncate text-white/90 flex items-center gap-1">
                {registrationFile ? (
                  <>
                    <Paperclip className="h-3 w-3" />
                    {registrationFile.name}
                  </>
                ) : (
                  'Choose file'
                )}
              </span>
            </label>
          </div>

          <p className="text-[10px] text-white/55">
            Rejected vehicles: use the same plate number to upload new photos and resubmit.
          </p>
          <AppButton type="submit" disabled={vLoading}>
            {vLoading ? 'Uploading…' : 'Add / resubmit vehicle'}
          </AppButton>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <h3 className="text-base font-bold text-white">My vehicles ({vehicles.length})</h3>
        {vehicles.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <Car className="h-8 w-8 text-brand-400 mx-auto mb-2" />
            <p className="text-sm text-white/80">No vehicles registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicles.map((v) => {
              const thumb = v.photoUrls?.[0] || v.imageUrl;
              return (
                <div key={v._id} className="glass-panel p-5 rounded-2xl border-l-2 border-brand-500">
                  {thumb && (
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-28 object-contain rounded-lg mb-3 bg-slateCustom-900"
                    />
                  )}
                  <div className="flex justify-between gap-2">
                    <div className="font-bold text-white text-sm">
                      {v.vehicleType || 'CAR'} · {v.company || v.make} {v.model}
                    </div>
                    <span className="text-xs font-bold text-white bg-slateCustom-800 px-2 py-0.5 rounded shrink-0">
                      {v.licensePlate}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/70 mt-1">
                    {v.color} • {v.year} • {v.totalSeats} seats
                  </p>
                  <p
                    className={`text-xs font-bold mt-2 ${
                      v.verificationStatus === 'APPROVED'
                        ? 'text-green-400'
                        : v.verificationStatus === 'REJECTED'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                    }`}
                  >
                    {v.verificationStatus === 'APPROVED'
                      ? 'Approved'
                      : v.verificationStatus === 'REJECTED'
                        ? 'Rejected'
                        : 'Pending admin review'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
