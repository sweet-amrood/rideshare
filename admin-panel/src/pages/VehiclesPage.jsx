import { useCallback, useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Grid,
  Alert,
  TextField,
  MenuItem,
  Stack
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';
import { toPreviewUrl } from '@/utils/documentPreview';

export default function VehiclesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState({ open: false, url: '', title: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(endpoints.vehicles, {
        params: {
          limit: 100,
          search: search.trim() || undefined,
          status: statusFilter || undefined
        }
      });
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load vehicles');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(endpoints.vehicle(id));
      setSelected(data.data);
      setRejectReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load vehicle');
    }
  };

  const review = async (status) => {
    if (!selected?._id) return;
    setActing(true);
    try {
      await api.patch(endpoints.vehicleReview(selected._id), {
        status,
        rejectionReason:
          status === 'REJECTED'
            ? rejectReason.trim() || 'Vehicle photos or registration did not meet requirements'
            : ''
      });
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Review failed');
    } finally {
      setActing(false);
    }
  };

  const photos = (v) => {
    const list = (v?.photoUrls || []).filter(Boolean);
    if (list.length) return list;
    return v?.imageUrl ? [v.imageUrl] : [];
  };

  return (
    <div>
      <PageHeader
        title="Vehicle management"
        subtitle="Review vehicle photos and registration documents before approving drivers"
      />

      {error && (
        <Alert severity="error" className="!mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper className="admin-card p-4 !mb-4" elevation={0}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            label="Search plate, model, owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </TextField>
          <Button variant="outlined" size="small" onClick={load}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Paper className="admin-card overflow-hidden" elevation={0}>
        {loading ? (
          <Skeleton height={300} />
        ) : items.length === 0 ? (
          <Box className="p-8 text-center text-white/60">
            <DirectionsCarIcon sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
            <Typography>No vehicles registered yet.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Owner</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Plate</TableCell>
                <TableCell>Photos</TableCell>
                <TableCell>Registration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((v) => {
                const photoList = photos(v);
                return (
                  <TableRow key={v._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {v.ownerId?.name || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {v.ownerId?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {v.company} {v.model} ({v.vehicleType})
                      <Typography variant="caption" display="block" color="text.secondary">
                        {v.color} · {v.year} · {v.totalSeats} seats
                      </Typography>
                    </TableCell>
                    <TableCell>{v.licensePlate}</TableCell>
                    <TableCell>{photoList.length || '—'}</TableCell>
                    <TableCell>{v.registrationDocUrl ? 'Yes' : '—'}</TableCell>
                    <TableCell>
                      <StatusChip status={v.verificationStatus || 'PENDING'} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => openDetail(v._id)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="md"
        fullWidth
      >
        {selected && (
          <>
            <DialogTitle>
              {selected.company} {selected.model} · {selected.licensePlate}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" className="!mb-3">
                Owner: {selected.ownerId?.name} ({selected.ownerId?.email})
              </Typography>
              <StatusChip status={selected.verificationStatus || 'PENDING'} />

              <Typography variant="subtitle2" fontWeight={700} className="!mt-4 !mb-2">
                Vehicle photos
              </Typography>
              {photos(selected).length === 0 ? (
                <Alert severity="warning">No vehicle photos uploaded.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {photos(selected).map((url, i) => (
                    <Grid item xs={6} sm={4} key={url}>
                      <Box
                        component="button"
                        type="button"
                        onClick={() =>
                          setPreview({
                            open: true,
                            url,
                            title: `Vehicle photo ${i + 1}`
                          })
                        }
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          overflow: 'hidden',
                          p: 0,
                          cursor: 'pointer',
                          width: '100%',
                          bgcolor: 'background.default'
                        }}
                      >
                        <Box
                          component="img"
                          src={toPreviewUrl(url, { maxWidth: 800 })}
                          alt={`Vehicle ${i + 1}`}
                          sx={{
                            width: '100%',
                            height: 140,
                            objectFit: 'contain',
                            display: 'block',
                            bgcolor: '#0f172a'
                          }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}

              <Typography variant="subtitle2" fontWeight={700} className="!mt-4 !mb-2">
                Registration card / papers
              </Typography>
              {selected.registrationDocUrl ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setPreview({
                      open: true,
                      url: selected.registrationDocUrl,
                      title: 'Registration document'
                    })
                  }
                >
                  Open registration document
                </Button>
              ) : (
                <Alert severity="warning">No registration document uploaded.</Alert>
              )}

              {selected.verificationStatus === 'REJECTED' && selected.rejectionReason && (
                <Alert severity="error" className="!mt-3">
                  {selected.rejectionReason}
                </Alert>
              )}

              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Rejection reason (if rejecting)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="!mt-4"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelected(null)}>Close</Button>
              <Button
                color="error"
                disabled={acting}
                onClick={() => review('REJECTED')}
              >
                Reject
              </Button>
              <Button
                color="success"
                variant="contained"
                disabled={acting}
                onClick={() => review('APPROVED')}
              >
                Approve vehicle
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <DocumentPreviewModal
        open={preview.open}
        onClose={() => setPreview({ open: false, url: '', title: '' })}
        url={preview.url}
        title={preview.title}
      />
    </div>
  );
}
