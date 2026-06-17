import { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  TextField,
  Typography,
  Skeleton
} from '@mui/material';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';

export default function ReportsPage() {
  const [data, setData] = useState({ items: [], repeatOffenders: [] });
  const [loading, setLoading] = useState(true);
  const [resolveDlg, setResolveDlg] = useState(null);
  const [form, setForm] = useState({ status: 'RESOLVED', adminAction: 'WARNING', adminNotes: '' });

  const load = async () => {
    setLoading(true);
    const { data: res } = await api.get(endpoints.reports);
    setData({ items: res.items || [], repeatOffenders: res.repeatOffenders || [] });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resolve = async () => {
    if (!resolveDlg) return;
    await api.patch(endpoints.resolveReport(resolveDlg._id), form);
    setResolveDlg(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Trust & safety"
        subtitle="Harassment, scams, unsafe driving — warnings, suspensions, bans"
      />
      {data.repeatOffenders?.length > 0 && (
        <Paper className="admin-card p-4 mb-4" elevation={0}>
          <Typography fontWeight={700} color="warning.main" className="mb-2">
            Repeat offenders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.repeatOffenders.length} users with multiple open reports
          </Typography>
        </Paper>
      )}
      <Paper className="admin-card overflow-hidden" elevation={0}>
        {loading ? (
          <Skeleton height={300} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Trip</TableCell>
                <TableCell>Reporter</TableCell>
                <TableCell>Reported</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {r.rideRequestId?.requestRef || (r.rideRequestId ? 'On-demand' : r.bookingId ? 'Carpool' : '—')}
                  </TableCell>
                  <TableCell>{r.reporterId?.name}</TableCell>
                  <TableCell>
                    {r.reportedUserId?.name}
                    <br />
                    <span className="text-xs">Trust {r.reportedUserId?.trustScore}</span>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={r.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setResolveDlg(r)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
      <Dialog open={Boolean(resolveDlg)} onClose={() => setResolveDlg(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Resolve report</DialogTitle>
        <DialogContent className="space-y-3 !pt-2">
          <TextField
            select
            fullWidth
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <MenuItem value="RESOLVED">Resolved</MenuItem>
            <MenuItem value="DISMISSED">Dismissed</MenuItem>
            <MenuItem value="UNDER_REVIEW">Under review</MenuItem>
          </TextField>
          <TextField
            select
            fullWidth
            label="Action"
            value={form.adminAction}
            onChange={(e) => setForm({ ...form, adminAction: e.target.value })}
          >
            <MenuItem value="WARNING">Warning</MenuItem>
            <MenuItem value="SUSPEND">Suspend user</MenuItem>
            <MenuItem value="BAN">Ban user</MenuItem>
            <MenuItem value="DISMISS">Dismiss only</MenuItem>
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes"
            value={form.adminNotes}
            onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
          />
          <Button variant="contained" fullWidth onClick={resolve}>
            Apply
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
