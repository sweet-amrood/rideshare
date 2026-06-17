import { useState, useMemo, useEffect } from 'react';
import { Car, FileText, Camera, CreditCard, Upload, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import AppButton from '@/components/common/AppButton';
import { driverService } from '@/api/services/driver.service';
import { documentService } from '@/api/services/document.service';
import { vehicleService } from '@/api/services/vehicle.service';
import {
  VEHICLE_TYPES,
  COMPANIES_BY_TYPE,
  MODEL_HINTS,
  getDefaultSeats,
  getPlateLabel
} from '../constants/vehicleCatalog';

const inputClass =
  'w-full bg-slateCustom-800 border border-slateCustom-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50';
const labelClass = 'text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1';

const TYPE_ICONS = { CAR: Car, BIKE: Car, RICKSHAW: Car };

const UPLOAD_KIND = { cnic: 'cnic', selfie: 'selfie', license: 'license' };

export default function DriverSetupWizard({
  userId,
  onComplete,
  onCancel,
  showCancel = false,
  cancelLabel = 'Cancel',
  documentsOnly = false,
  title = 'Driver setup',
  subtitle = 'Register your ride and verify CNIC, selfie, and license before offering carpools.'
}) {
  const [step, setStep] = useState(documentsOnly ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(!documentsOnly);
  const [vehicleAlreadyComplete, setVehicleAlreadyComplete] = useState(false);

  const [vehicleType, setVehicleType] = useState('CAR');
  const [company, setCompany] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [totalSeats, setTotalSeats] = useState(4);

  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  const [registrationFile, setRegistrationFile] = useState(null);

  const [cnicFile, setCnicFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);

  const companies = useMemo(
    () => COMPANIES_BY_TYPE[vehicleType] || COMPANIES_BY_TYPE.CAR,
    [vehicleType]
  );

  useEffect(() => {
    if (documentsOnly) {
      setStatusLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await driverService.getSetupStatus();
        const data = res.data;
        if (cancelled) return;
        if (data?.needsDocumentsOnly && data?.vehicleComplete) {
          setVehicleAlreadyComplete(true);
          setStep(1);
          const v = data.vehicle;
          if (v) {
            setVehicleType(v.vehicleType || 'CAR');
            setCompany(v.company || '');
            setModel(v.model || '');
            setYear(String(v.year || new Date().getFullYear()));
            setColor(v.color || '');
            setLicensePlate(v.licensePlate || '');
            setTotalSeats(v.totalSeats || getDefaultSeats(v.vehicleType || 'CAR'));
          }
        }
      } catch {
        /* full wizard fallback */
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentsOnly]);

  const handleTypeChange = (type) => {
    setVehicleType(type);
    setCompany('');
    setTotalSeats(getDefaultSeats(type));
  };

  const handleFilePick = (file, setter, label) => {
    if (!file) return;
    setter(file);
    toast.success(`${label} attached`);
  };

  const uploadAllDocuments = async () => {
    const items = [
      { kind: 'cnic', file: cnicFile },
      { kind: 'selfie', file: selfieFile },
      { kind: 'license', file: licenseFile }
    ];
    const res = await documentService.uploadVerificationBatch(items);
    const links = res.data?.links || {};
    const fileList = res.data?.files || [];
    const urlFor = (type) => fileList.find((f) => f.type === type)?.url;

    const urls = {
      cnicUrl: links.cnicUrl || urlFor('CNIC'),
      selfieUrl: links.selfieUrl || urlFor('SELFIE'),
      licenseUrl: links.licenseUrl || urlFor('DRIVING_LICENSE')
    };

    if (!urls.cnicUrl || !urls.selfieUrl || !urls.licenseUrl) {
      throw new Error('One or more documents failed to upload. Please try again.');
    }
    return urls;
  };

  const addVehiclePhotos = (fileList) => {
    const picked = Array.from(fileList || []).slice(0, 4);
    if (!picked.length) return;
    setVehiclePhotos((prev) => [...prev, ...picked].slice(0, 4));
    toast.success(`${picked.length} photo(s) attached`);
  };

  const validateVehicle = () => {
    if (!company) {
      toast.error('Select a company / brand');
      return false;
    }
    if (!model.trim()) {
      toast.error('Enter model name');
      return false;
    }
    if (!licensePlate.trim()) {
      toast.error(`Enter ${getPlateLabel(vehicleType).toLowerCase()}`);
      return false;
    }
    if (!vehiclePhotos.length) {
      toast.error('Add at least one photo of your vehicle');
      return false;
    }
    if (!registrationFile) {
      toast.error('Attach your vehicle registration card or papers');
      return false;
    }
    return true;
  };

  const validateDocs = () => {
    if (!cnicFile || !selfieFile || !licenseFile) {
      toast.error('Attach CNIC, selfie, and driving license before submitting');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validateDocs()) return;
    setLoading(true);
    try {
      const documents = await uploadAllDocuments();
      const skipVehicle = vehicleAlreadyComplete && !documentsOnly;

      let res;
      if (documentsOnly) {
        res = await driverService.resubmitDocuments(documents);
      } else if (skipVehicle) {
        res = await driverService.completeSetup({ documents, skipVehicle: true });
      } else {
        const mediaRes = await vehicleService.uploadVehicleMedia({
          photos: vehiclePhotos,
          registration: registrationFile
        });
        const vehicleMedia = mediaRes.data || {};
        res = await driverService.completeSetup({
          vehicle: {
            vehicleType,
            company,
            model: model.trim(),
            year: parseInt(year, 10),
            color: color.trim() || '—',
            licensePlate: licensePlate.trim(),
            totalSeats,
            photoUrls: vehicleMedia.photoUrls || [],
            photoPublicIds: vehicleMedia.photoPublicIds || [],
            registrationDocUrl: vehicleMedia.registrationDocUrl || '',
            registrationDocPublicId: vehicleMedia.registrationDocPublicId || '',
            imageUrl: vehicleMedia.imageUrl || vehicleMedia.photoUrls?.[0] || ''
          },
          documents
        });
      }
      if (!documentsOnly && res.applicationSubmitted) {
        onComplete?.(res.data);
        return;
      }
      toast.success(res.message || (documentsOnly ? 'Documents resubmitted' : 'Driver setup complete'));
      onComplete?.(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const steps = vehicleAlreadyComplete && !documentsOnly
    ? ['Verify documents']
    : ['Ride details', 'Verify documents'];
  const showVehicleStep = !documentsOnly && !vehicleAlreadyComplete && step === 0;
  const showDocsStep = documentsOnly ? step === 1 : vehicleAlreadyComplete ? step === 1 : step === 1;

  if (statusLoading) {
    return (
      <div className="py-12 text-center text-white/70 text-sm">Checking your driver profile…</div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h2 className="text-xl font-extrabold text-white">
          {vehicleAlreadyComplete && !documentsOnly ? 'Verify your identity' : title}
        </h2>
        <p className="text-sm text-white/75 mt-1">
          {vehicleAlreadyComplete && !documentsOnly
            ? 'Your vehicle is already on file. Upload CNIC, selfie, and driving license to finish driver setup.'
            : subtitle}
        </p>
      </div>

      {vehicleAlreadyComplete && !documentsOnly && (
        <p className="text-xs text-brand-300/90 bg-brand-500/10 border border-brand-500/20 rounded-lg px-3 py-2">
          Vehicle registered
          {licensePlate ? ` · ${licensePlate}` : ''}
          {company && model ? ` — ${company} ${model}` : ''}
        </p>
      )}

      <div className="flex gap-2">
        {steps.map((label, i) => {
          const activeIndex = vehicleAlreadyComplete && !documentsOnly ? (step === 1 ? 0 : -1) : step;
          return (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full ${i <= activeIndex ? 'bg-brand-500' : 'bg-slateCustom-700'}`}
            />
          );
        })}
      </div>
      <p className="text-xs text-white/60">
        {vehicleAlreadyComplete && !documentsOnly
          ? `Personal documents`
          : `Step ${step + 1} of ${steps.length}: ${steps[vehicleAlreadyComplete && !documentsOnly ? 0 : step]}`}
      </p>

      {showVehicleStep && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <p className="text-sm text-white/80">What will you use to offer rides?</p>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLE_TYPES.map(({ id, label }) => {
              const Icon = TYPE_ICONS[id] || Car;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTypeChange(id)}
                  className={`choice-btn p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    vehicleType === id
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-slateCustom-700 bg-transparent text-white/70'
                  }`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-1 text-brand-400" />
                  {label}
                </button>
              );
            })}
          </div>

          <div>
            <label className={labelClass}>Company / brand</label>
            <select
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClass}
            >
              <option value="">Select company</option>
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
              value={model}
              onChange={(e) => setModel(e.target.value)}
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
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Color</label>
              <input value={color} onChange={(e) => setColor(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>{getPlateLabel(vehicleType)}</label>
            <input
              required
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              className={inputClass}
              placeholder={vehicleType === 'CAR' ? 'LEA-1234' : 'Registration no.'}
            />
          </div>

          <div>
            <label className={labelClass}>Passenger seats you offer</label>
            <input
              type="number"
              min={1}
              max={vehicleType === 'BIKE' ? 1 : vehicleType === 'RICKSHAW' ? 4 : 6}
              value={totalSeats}
              onChange={(e) => setTotalSeats(parseInt(e.target.value, 10) || 1)}
              className={inputClass}
            />
          </div>

          <div className="pt-2 border-t border-slateCustom-700 space-y-3">
            <p className="text-xs text-white/70">
              Vehicle photos and registration papers (uploaded when you submit on the next step).
            </p>
            <div
              className={`p-4 rounded-xl border ${
                vehiclePhotos.length
                  ? 'border-green-500/40 bg-green-500/5'
                  : 'border-dashed border-slateCustom-600'
              }`}
            >
              <label className={labelClass}>Vehicle photos (1–4)</label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-300">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={loading}
                  onChange={(e) => {
                    addVehiclePhotos(e.target.files);
                    e.target.value = '';
                  }}
                />
                <span className="text-white/90">
                  {vehiclePhotos.length
                    ? `${vehiclePhotos.length} photo(s) selected`
                    : 'Choose exterior/interior photos'}
                </span>
              </label>
            </div>
            <div
              className={`p-4 rounded-xl border ${
                registrationFile
                  ? 'border-green-500/40 bg-green-500/5'
                  : 'border-dashed border-slateCustom-600'
              }`}
            >
              <label className={labelClass}>Registration card / papers</label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-300">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={loading}
                  onChange={(e) => {
                    handleFilePick(e.target.files?.[0], setRegistrationFile, 'Registration');
                    e.target.value = '';
                  }}
                />
                <span className="truncate text-white/90">
                  {registrationFile ? registrationFile.name : 'Choose file'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {showCancel && (
              <AppButton type="button" variant="secondary" onClick={onCancel}>
                {cancelLabel}
              </AppButton>
            )}
            <AppButton
              type="button"
              className="flex-1"
              onClick={() => {
                if (validateVehicle()) setStep(1);
              }}
            >
              Continue to verification
            </AppButton>
          </div>
        </div>
      )}

      {showDocsStep && (
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <p className="text-sm text-white/80">
            Attach clear photos of your CNIC, a selfie, and your driving license. Files upload when
            you click Submit.
          </p>

          {[
            {
              key: 'cnic',
              label: 'CNIC (front)',
              icon: CreditCard,
              file: cnicFile,
              setFile: setCnicFile
            },
            {
              key: 'selfie',
              label: 'Selfie',
              icon: Camera,
              file: selfieFile,
              setFile: setSelfieFile
            },
            {
              key: 'license',
              label: 'Driving license',
              icon: FileText,
              file: licenseFile,
              setFile: setLicenseFile
            }
          ].map(({ key, label, icon: Icon, file, setFile }) => (
            <div
              key={key}
              className={`p-4 rounded-xl border ${
                file ? 'border-green-500/40 bg-green-500/5' : 'border-slateCustom-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-5 w-5 text-brand-400" />
                <span className="text-sm font-bold text-white">{label}</span>
                {file && (
                  <span className="text-[10px] text-green-400 font-bold ml-auto flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    Attached
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-300">
                <Upload className="h-4 w-4 shrink-0" />
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={loading}
                  onChange={(e) => {
                    handleFilePick(e.target.files?.[0], setFile, label);
                    e.target.value = '';
                  }}
                />
                <span className="truncate text-white/90">
                  {file ? file.name : 'Choose file'}
                </span>
              </label>
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {!documentsOnly && (
              <AppButton type="button" variant="secondary" onClick={() => setStep(0)}>
                Back
              </AppButton>
            )}
            {showCancel && (
              <AppButton type="button" variant="secondary" onClick={onCancel}>
                {cancelLabel}
              </AppButton>
            )}
            <AppButton
              type="button"
              className="flex-1"
              disabled={loading || !cnicFile || !selfieFile || !licenseFile}
              onClick={submit}
            >
              {loading ? 'Uploading & submitting…' : documentsOnly ? 'Submit documents' : 'Submit for verification'}
            </AppButton>
          </div>
        </div>
      )}
    </div>
  );
}
