import { useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  getDocumentPreviewMode,
  isPreviewableDocument,
  toPreviewUrl
} from '@/utils/documentPreview';

const STATUS_COLOR = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  RESUBMIT: 'warning'
};

const DOC_LABELS = {
  CNIC: 'CNIC / National ID',
  SELFIE: 'Selfie verification',
  DRIVING_LICENSE: 'Driving license',
  DOMAIN: 'Student / Company ID',
  PASSPORT: 'Passport',
  STUDENT_ID: 'Student ID',
  COMPANY_ID: 'Company ID',
  VEHICLE_REGISTRATION: 'Vehicle registration',
  INSURANCE: 'Insurance'
};

export default function DocumentReviewCard({ doc, onReview, onPreview, busy }) {
  const [acting, setActing] = useState(false);
  const displayLabel = doc.label || DOC_LABELS[doc.type] || doc.type || 'Document';
  const hasUrl = Boolean(doc.url?.trim());
  const displayUrl = hasUrl ? toPreviewUrl(doc.url) : '';
  const previewable = isPreviewableDocument(doc);
  const canPreview =
    previewable && getDocumentPreviewMode(doc.url, doc.mimeType || '', doc) !== 'empty';

  const isImage =
    previewable && getDocumentPreviewMode(doc.url, doc.mimeType || '', doc) === 'image';

  const openPreview = () => {
    if (!hasUrl) return;
    onPreview?.(doc);
  };

  const canOpenPreview = hasUrl;

  const runReview = async (decision) => {
    setActing(true);
    try {
      await onReview(doc.type, decision);
    } finally {
      setActing(false);
    }
  };

  const disabled = acting || busy;

  return (
    <Paper
      elevation={0}
      className={`p-4 rounded-xl border h-full flex flex-col ${
        doc.status === 'APPROVED'
          ? 'border-green-500/40 bg-green-500/5'
          : doc.status === 'REJECTED'
            ? 'border-red-500/40 bg-red-500/5'
            : 'border-slate-600'
      }`}
    >
      <Box className="flex justify-between items-start gap-2 mb-2">
        <div>
          <Typography fontWeight={700} color="text.primary">
            {displayLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {doc.type}
          </Typography>
        </div>
        <Box className="flex flex-col items-end gap-1">
          <Chip
            label={doc.status}
            size="small"
            color={STATUS_COLOR[doc.status] || 'default'}
            variant="outlined"
          />
          {hasUrl && !previewable && (
            <Chip label="Re-upload required" size="small" color="warning" variant="filled" />
          )}
        </Box>
      </Box>

      {isImage && (
        <Box
          component="button"
          type="button"
          className="mb-3 rounded-lg overflow-hidden border border-slate-700 cursor-pointer bg-slate-900/50 w-full p-0 block"
          onClick={openPreview}
        >
          <img
            src={displayUrl}
            alt={displayLabel}
            className="w-full h-32 object-contain pointer-events-none bg-slate-950"
            onError={(e) => {
              e.target.onerror = null;
              if (displayUrl !== doc.url && doc.url) {
                e.target.src = doc.url;
              } else {
                e.target.style.display = 'none';
              }
            }}
          />
        </Box>
      )}

      <Button
        type="button"
        size="small"
        fullWidth
        variant="outlined"
        startIcon={<VisibilityIcon />}
        onClick={openPreview}
        disabled={!canOpenPreview}
        className="!mb-3"
      >
        {!hasUrl
          ? 'No preview available'
          : canPreview
            ? 'Open document preview'
            : 'View details (re-upload required)'}
      </Button>

      <Box className="flex gap-2 mt-auto">
        <Button
          type="button"
          size="small"
          variant="contained"
          color="success"
          fullWidth
          disabled={disabled || doc.status === 'APPROVED'}
          startIcon={acting ? <CircularProgress size={14} /> : <CheckCircleIcon />}
          onClick={() => runReview('APPROVED')}
        >
          Accept
        </Button>
        <Button
          type="button"
          size="small"
          variant="contained"
          color="error"
          fullWidth
          disabled={disabled || doc.status === 'REJECTED'}
          startIcon={<CancelIcon />}
          onClick={() => runReview('REJECTED')}
        >
          Reject
        </Button>
      </Box>
    </Paper>
  );
}
