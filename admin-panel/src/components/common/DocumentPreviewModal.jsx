import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Alert,
  Button,
  Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useEffect, useState } from 'react';
import {
  getDocumentPreviewMode,
  toPreviewUrl,
  isInvalidDocumentUrl,
  INVALID_PREVIEW_MESSAGE
} from '@/utils/documentPreview';

export default function DocumentPreviewModal({
  open,
  onClose,
  url,
  title,
  footer,
  mimeType = '',
  previewDoc = null
}) {
  const [imgError, setImgError] = useState(false);
  const rawUrl = (url || previewDoc?.url || '').trim();
  const previewUrl = toPreviewUrl(rawUrl) || rawUrl;
  const forceTry =
    rawUrl && !isInvalidDocumentUrl(rawUrl) && /res\.cloudinary\.com/i.test(rawUrl);
  let mode = getDocumentPreviewMode(rawUrl, mimeType, previewDoc);
  if (forceTry && (mode === 'invalid' || mode === 'empty')) {
    mode = /\.pdf(\?|$)/i.test(rawUrl) || /\/raw\/upload\//i.test(rawUrl) ? 'pdf' : 'image';
  }

  useEffect(() => {
    if (open) setImgError(false);
  }, [open, rawUrl]);

  const handleClose = () => {
    setImgError(false);
    onClose?.();
  };

  const showInvalidHint = mode === 'invalid' && rawUrl;
  const canRender = rawUrl && mode !== 'empty' && (mode !== 'invalid' || forceTry);

  return (
    <Dialog
      open={Boolean(open)}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableScrollLock
      sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
      PaperProps={{
        sx: {
          zIndex: (theme) => theme.zIndex.modal + 20,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        <Typography component="span" variant="h6" fontWeight={700}>
          {title || 'Document preview'}
        </Typography>
        <IconButton onClick={handleClose} aria-label="Close" edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers={Boolean(footer)} sx={{ minHeight: 200, bgcolor: 'background.default' }}>
        {rawUrl && (
          <Box className="flex gap-2 mb-3 flex-wrap">
            <Button
              size="small"
              variant="outlined"
              component="a"
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNewIcon />}
            >
              Open in new tab
            </Button>
          </Box>
        )}

        {!rawUrl ? (
          <Typography color="text.secondary">No document URL available for this file.</Typography>
        ) : null}

        {showInvalidHint && !forceTry ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {INVALID_PREVIEW_MESSAGE}
          </Alert>
        ) : null}

        {canRender && mode === 'image' && !imgError ? (
          <Box
            component="img"
            src={previewUrl}
            alt={title || 'Document'}
            onError={() => setImgError(true)}
            sx={{
              maxWidth: '100%',
              maxHeight: '70vh',
              display: 'block',
              mx: 'auto',
              borderRadius: 1,
              objectFit: 'contain',
              bgcolor: '#0f172a'
            }}
          />
        ) : null}

        {canRender && (mode === 'pdf' || (mode === 'image' && imgError) || mode === 'embed') ? (
          <Box
            component="iframe"
            src={previewUrl}
            title={title || 'Document'}
            sx={{
              width: '100%',
              minHeight: '65vh',
              border: 'none',
              borderRadius: 1,
              bgcolor: 'white'
            }}
          />
        ) : null}

        {rawUrl && showInvalidHint ? (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ wordBreak: 'break-all', mt: 2 }}>
            Stored URL:{' '}
            <Link href={rawUrl} target="_blank" rel="noopener noreferrer">
              {rawUrl}
            </Link>
          </Typography>
        ) : null}
      </DialogContent>

      {footer ? (
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', p: 2 }}>
          {footer}
        </DialogActions>
      ) : null}
    </Dialog>
  );
}
