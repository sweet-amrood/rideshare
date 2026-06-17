import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, Clock, ShieldCheck, Mail, Phone, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import AppButton from '@/components/common/AppButton';
import VerificationBadges from './VerificationBadges';
import { profileService } from '@/api/services/profile.service';
import {
  documentService,
  getUploadedFileUrl
} from '@/api/services/document.service';

const DOC_LABELS = {
  CNIC: 'CNIC',
  SELFIE: 'Selfie',
  DRIVING_LICENSE: 'Driving license',
  DOMAIN: 'Student / Company ID'
};

export default function VerificationTab({ user, architecture, onGoToAbout, onVerificationUpdated }) {
  const navigate = useNavigate();
  const { isDriver } = useRoles();
  const { setUser } = useAuth();
  const [layers, setLayers] = useState(architecture?.layers || []);
  const [trustScore, setTrustScore] = useState(architecture?.trustScore || user?.trustScore || 0);
  const [docLoading, setDocLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [pendingFiles, setPendingFiles] = useState({
    cnic: null,
    selfie: null,
    license: null
  });

  const refreshDocs = async () => {
    try {
      const res = await documentService.getMyDocuments();
      if (res.success && res.data?.items) setUploadedDocs(res.data.items);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (architecture) {
      setLayers(architecture.layers);
      setTrustScore(architecture.trustScore);
    } else {
      profileService.getVerificationArchitecture().then((res) => {
        if (res.success) {
          setLayers(res.data.layers);
          setTrustScore(res.data.trustScore);
        }
      });
    }
  }, [architecture]);

  useEffect(() => {
    refreshDocs();
  }, [user?._id, user?.verification?.status]);

  const applyVerification = (verification) => {
    if (verification) setUser({ verification });
  };

  const attachFile = (kind, file, label) => {
    if (!file) return;
    setPendingFiles((prev) => ({ ...prev, [kind]: file }));
    toast.success(`${label} attached`);
  };

  const hasPendingFiles = Object.values(pendingFiles).some(Boolean);

  const handleSubmitDocs = async () => {
    const entries = [
      { kind: 'cnic', file: pendingFiles.cnic, label: 'CNIC' },
      { kind: 'selfie', file: pendingFiles.selfie, label: 'Selfie' },
      { kind: 'license', file: pendingFiles.license, label: 'Driving license' }
    ].filter((e) => e.file);

    if (!entries.length) {
      toast.error('Attach at least one document before submitting');
      return;
    }

    setDocLoading(true);
    try {
      const res =
        entries.length === 1
          ? await documentService.uploadVerificationDocument(entries[0].file, entries[0].kind)
          : await documentService.uploadVerificationBatch(
              entries.map(({ kind, file }) => ({ kind, file }))
            );

      const files = res.data?.files || (res.data?.file ? [res.data.file] : []);
      if (entries.length === 1 && !getUploadedFileUrl(res)) {
        throw new Error(`${entries[0].label} upload succeeded but no file URL was returned`);
      }
      if (entries.length > 1 && files.length < entries.length) {
        throw new Error('Some documents did not save. Please try again.');
      }

      setPendingFiles({ cnic: null, selfie: null, license: null });
      await refreshDocs();
      if (res.verification) applyVerification(res.verification);
      onVerificationUpdated?.();
      toast.success(
        entries.length > 1
          ? `${files.length || entries.length} documents submitted for admin review`
          : 'Document submitted for admin review'
      );
    } catch (err) {
      await refreshDocs();
      toast.error(err.response?.data?.message || err.message || 'Submit failed');
    } finally {
      setDocLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setPhoneLoading(true);
    try {
      await profileService.verifyPhone();
      toast.success('Phone verified');
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Phone verification failed');
    } finally {
      setPhoneLoading(false);
    }
  };

  const status = user?.verification?.status;
  const canUpload = status !== 'APPROVED';
  const hasRejectedDoc = uploadedDocs.some((d) => d.status === 'REJECTED');
  const showResubmitCta = status === 'REJECTED' || hasRejectedDoc;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-brand-400" />
          Trust & verification
        </h3>
        <VerificationBadges badges={user?.badges} trustScore={trustScore} />
        <div className="mt-6 space-y-3">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                layer.complete
                  ? 'bg-green-500/10 border-green-500/25'
                  : 'bg-slateCustom-800/40 border-slateCustom-700'
              }`}
            >
              <div>
                <div className="text-sm font-bold text-white">{layer.label}</div>
                {layer.setup && !layer.complete && (
                  <p className="text-[10px] text-white/60 mt-0.5">{layer.setup}</p>
                )}
                {layer.criteria && (
                  <p className="text-[10px] text-white/50 mt-0.5">{layer.criteria}</p>
                )}
                {layer.status && !layer.complete && (
                  <p className="text-[10px] text-yellow-400 mt-0.5">Status: {layer.status}</p>
                )}
              </div>
              {layer.complete ? (
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-white/40 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-400" />
            Email
          </h4>
          {user.isEmailVerified ? (
            <p className="text-sm text-green-400">Verified — {user.email}</p>
          ) : (
            <>
              <p className="text-sm text-white/80">Confirm your signup email to unlock full access.</p>
              <Link to="/verify-email" className="text-sm font-semibold text-brand-400 no-underline">
                Complete email verification →
              </Link>
            </>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Phone className="h-5 w-5 text-brand-400" />
            Phone
          </h4>
          <p className="text-sm text-white/80">{user.phoneNumber || 'No number on file'}</p>
          {user.isPhoneVerified ? (
            <p className="text-sm text-green-400">Phone verified</p>
          ) : (
            <AppButton type="button" disabled={phoneLoading} onClick={handleVerifyPhone}>
              {phoneLoading ? 'Verifying…' : 'Verify phone number'}
            </AppButton>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4 md:col-span-2">
          <h4 className="font-bold text-white flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-brand-400" />
            KYC documents
          </h4>
          {status === 'APPROVED' && (
            <p className="text-sm text-green-400 font-bold">KYC approved</p>
          )}
          {status === 'PENDING' && !showResubmitCta && (
            <p className="text-sm text-yellow-400 font-bold">Pending admin review</p>
          )}
          {showResubmitCta && (
            <div className="space-y-3">
              <p className="text-sm text-red-400 font-bold">
                Verification not approved — replace the rejected file(s) below
              </p>
              {user.verification?.rejectionReason && (
                <p className="text-sm text-white/80 bg-red-500/10 border border-red-500/25 rounded-lg p-3">
                  {user.verification.rejectionReason}
                </p>
              )}
              {isDriver && (
                <AppButton type="button" variant="secondary" onClick={() => navigate('/driver/resubmit-documents')}>
                  Re-upload all driver documents (wizard)
                </AppButton>
              )}
            </div>
          )}

          {uploadedDocs.length > 0 && (
            <ul className="text-sm text-white/80 space-y-2">
              {uploadedDocs.map((d) => (
                <li
                  key={d.type}
                  className={`flex justify-between items-center px-3 py-2 rounded-lg border ${
                    d.status === 'REJECTED'
                      ? 'border-red-500/40 bg-red-500/10'
                      : d.status === 'APPROVED'
                        ? 'border-green-500/40 bg-green-500/10'
                        : 'border-slateCustom-700'
                  }`}
                >
                  <span>{d.label || DOC_LABELS[d.type] || d.type}</span>
                  <span
                    className={
                      d.status === 'REJECTED'
                        ? 'text-red-300 text-xs font-bold'
                        : d.status === 'APPROVED'
                          ? 'text-green-300 text-xs font-bold'
                          : 'text-yellow-300 text-xs font-bold'
                    }
                  >
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {canUpload && (
            <div className="space-y-3 max-w-md">
              <p className="text-xs text-white/70">
                Attach files for each document you want to replace, then click Submit. Nothing is
                uploaded until you submit.
              </p>
              {[
                { kind: 'cnic', label: 'CNIC' },
                { kind: 'selfie', label: 'Selfie' },
                { kind: 'license', label: 'Driving license' }
              ].map(({ kind, label }) => {
                const file = pendingFiles[kind];
                return (
                  <div
                    key={kind}
                    className={`rounded-xl border p-4 ${
                      file
                        ? 'border-green-500/40 bg-green-500/5'
                        : 'border-dashed border-slateCustom-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <UploadCloud className="h-5 w-5 text-brand-400 shrink-0" />
                      <span className="text-sm font-bold text-white">{label}</span>
                      {file && (
                        <span className="text-[10px] text-green-400 font-bold ml-auto flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          Attached
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-300">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={docLoading}
                        onChange={(e) => {
                          attachFile(kind, e.target.files?.[0], label);
                          e.target.value = '';
                        }}
                      />
                      <span className="truncate text-white/90 flex-1">
                        {file ? file.name : 'Choose file'}
                      </span>
                    </label>
                  </div>
                );
              })}
              <AppButton
                type="button"
                disabled={docLoading || !hasPendingFiles}
                onClick={handleSubmitDocs}
                className="w-full"
              >
                {docLoading ? 'Uploading & submitting…' : 'Submit documents'}
              </AppButton>
            </div>
          )}
        </div>
      </div>

      {onGoToAbout && (
        <button
          type="button"
          onClick={onGoToAbout}
          className="text-sm text-brand-400 font-semibold border-0 bg-transparent outline-none"
        >
          Complete profile (bio & emergency contact) in About →
        </button>
      )}
    </div>
  );
}
