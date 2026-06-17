import { useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  Divider,
  Chip,
  Box,
  Avatar,
  List,
  ListItem,
  ListItemText,
  LinearProgress
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import DescriptionIcon from '@mui/icons-material/Description';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import StatusChip from '@/components/common/StatusChip';
import DocumentReviewCard from './DocumentReviewCard';
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';

export default function UserVerificationReview({
  userId,
  data,
  onReload,
  showAccountActions = false,
  onReviewSuccess
}) {
  const [busy, setBusy] = useState(false);
  const [notifyNote, setNotifyNote] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewDoc, setPreviewDoc] = useState(null);

  if (!data?.user) return null;

  const { user, documents, verificationHistory, stats, vehicles } = data;
  const total = documents?.items?.length || 0;
  const reviewed = (documents?.approvedCount || 0) + (documents?.rejectedCount || 0);
  const progress = total ? Math.round((reviewed / total) * 100) : 0;

  const reviewDoc = async (documentType, decision) => {
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      const { data: res } = await api.post(endpoints.userDocumentReview(userId, documentType), {
        decision
      });
      setMessage({
        type: 'success',
        text: decision === 'REJECTED' ? 'Document rejected.' : 'Document approved.'
      });
      onReload?.(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Review failed' });
    } finally {
      setBusy(false);
    }
  };

  const finalizeNotify = async () => {
    setBusy(true);
    try {
      const { data: res } = await api.post(endpoints.userDocumentsNotify(userId), {
        note: notifyNote.trim()
      });
      setMessage({
        type: 'success',
        text: res.message || 'Email and in-app notification sent.'
      });
      onReload?.(res.data);
      onReviewSuccess?.(user.verification?.status);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not notify user' });
    } finally {
      setBusy(false);
    }
  };

  const previewLabel =
    previewDoc?.label ||
    (previewDoc?.type && { CNIC: 'CNIC / National ID', SELFIE: 'Selfie', DRIVING_LICENSE: 'License' }[previewDoc.type]) ||
    'Document';

  return (
    <>
      <DocumentPreviewModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        url={previewDoc?.url}
        previewDoc={previewDoc}
        title={previewLabel}
        mimeType={previewDoc?.mimeType || ''}
        footer={
          previewDoc ? (
            <Box className="flex gap-2">
              <Button
                type="button"
                variant="contained"
                color="success"
                disabled={busy || previewDoc.status === 'APPROVED'}
                onClick={async () => {
                  await reviewDoc(previewDoc.type, 'APPROVED');
                  setPreviewDoc(null);
                }}
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="contained"
                color="error"
                disabled={busy || previewDoc.status === 'REJECTED'}
                onClick={async () => {
                  await reviewDoc(previewDoc.type, 'REJECTED');
                  setPreviewDoc(null);
                }}
              >
                Reject
              </Button>
            </Box>
          ) : null
        }
      />

      {message.text && (
        <Alert severity={message.type} className="!mb-4" onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper className="admin-card p-5" elevation={0}>
            <Box className="flex items-start gap-4 mb-4">
              <Avatar src={user.profile?.profilePictureUrl} sx={{ width: 56, height: 56 }}>
                {user.name?.[0]}
              </Avatar>
              <div className="flex-1">
                <Typography variant="h6" fontWeight={800}>
                  {user.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email} · {user.phoneNumber}
                </Typography>
                <Box className="flex gap-2 mt-2 flex-wrap">
                  <StatusChip status={documents?.status || user.verification?.status} />
                  <Chip size="small" label={`${reviewed}/${total} reviewed`} variant="outlined" />
                </Box>
                <LinearProgress variant="determinate" value={progress} className="!mt-3 rounded" />
              </div>
            </Box>

            <Typography variant="subtitle1" fontWeight={700} className="!mb-3 flex items-center gap-2">
              <DescriptionIcon fontSize="small" color="primary" />
              Review each document
            </Typography>

            {!documents?.items?.length ? (
              <Alert severity="info">No document files on this profile yet.</Alert>
            ) : (
              <Grid container spacing={2}>
                {documents.items.map((doc) => (
                  <Grid item xs={12} md={6} key={doc.type}>
                    <DocumentReviewCard
                      doc={doc}
                      onReview={reviewDoc}
                      onPreview={setPreviewDoc}
                      busy={busy}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>

          <Paper className="admin-card p-4 !mt-4" elevation={0}>
            <Typography fontWeight={700} className="!mb-2">
              Applicant details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Gender
                </Typography>
                <Typography variant="body2">{user.profile?.gender || '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  University / Company
                </Typography>
                <Typography variant="body2">{user.profile?.universityOrCompany || '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Trust score
                </Typography>
                <Typography variant="body2">{user.trustScore ?? 100}</Typography>
              </Grid>
            </Grid>
          </Paper>

          {verificationHistory?.length > 0 && (
            <Paper className="admin-card p-4 !mt-4" elevation={0}>
              <Typography fontWeight={700} className="!mb-2">
                Verification history
              </Typography>
              <List dense>
                {verificationHistory.slice(0, 8).map((h) => (
                  <ListItem key={h._id} divider>
                    <ListItemText primary={`${h.type} — ${h.status}`} secondary={h.rejectionReason} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper className="admin-card p-5 sticky top-4 space-y-4" elevation={0}>
            <Box className="flex items-center gap-2 text-indigo-300">
              <EmailIcon fontSize="small" />
              <Typography variant="body2">
                Review each file, then notify <strong>{user.email}</strong>
              </Typography>
            </Box>

            <div>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2">
                Approved: {documents?.approvedCount ?? 0} · Rejected: {documents?.rejectedCount ?? 0}{' '}
                · Pending: {documents?.pendingCount ?? 0}
              </Typography>
            </div>

            {documents?.rejectedCount > 0 && (
              <Alert severity="warning">
                {documents.rejectedCount} document(s) rejected. Add an optional note below, then finalize to
                email the user.
              </Alert>
            )}

            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              label={
                documents?.rejectedCount > 0
                  ? 'Rejection message (sent on finalize)'
                  : 'Optional note added to email'
              }
              value={notifyNote}
              onChange={(e) => setNotifyNote(e.target.value)}
              placeholder={
                documents?.rejectedCount > 0
                  ? 'Your verification was not approved. Please re-upload clearer documents.'
                  : ''
              }
            />

            <Button
              fullWidth
              variant="contained"
              startIcon={<SendIcon />}
              disabled={busy || !documents?.allReviewed}
              onClick={finalizeNotify}
            >
              Finalize & email user
            </Button>
            {!documents?.allReviewed && (
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                Accept or reject every document first
              </Typography>
            )}

            {showAccountActions && (
              <>
                <Divider />
                <Button
                  size="small"
                  fullWidth
                  onClick={async () => {
                    await api.patch(endpoints.userStatus(userId), { accountStatus: 'SUSPENDED' });
                    onReload?.();
                  }}
                >
                  Suspend account
                </Button>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
