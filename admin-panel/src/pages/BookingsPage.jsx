import { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  Button,
  Skeleton,
  Link as MuiLink
} from '@mui/material';
import { Link } from 'react-router-dom';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';

export default function BookingsPage() {
  const [tab, setTab] = useState(0);
  const [carpool, setCarpool] = useState([]);
  const [onDemand, setOnDemand] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = { status: status || undefined };
    if (tab === 1) params.status = 'COMPLETED';
    const { data } = await api.get(endpoints.bookings, { params });
    setCarpool(data.carpool || []);
    setOnDemand(data.onDemand || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [status, tab]);

  return (
    <div>
      <PageHeader
        title="Bookings & trips"
        subtitle="Carpool seat bookings and completed on-demand rides (reviews/reports tied to completed trips)"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} className="mb-4">
        <Tab label="All" />
        <Tab label="Completed on-demand" />
      </Tabs>
      <TextField
        select
        size="small"
        label="Carpool status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="mb-4 min-w-[160px]"
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="PENDING">Pending</MenuItem>
        <MenuItem value="CONFIRMED">Confirmed</MenuItem>
        <MenuItem value="COMPLETED">Completed</MenuItem>
        <MenuItem value="CANCELLED">Cancelled</MenuItem>
      </TextField>

      <h3 className="text-sm font-bold text-slate-300 mb-2">On-demand rides</h3>
      <Paper className="admin-card overflow-hidden mb-8" elevation={0}>
        {loading ? (
          <Skeleton height={120} />
        ) : onDemand.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm">No on-demand trips.</p>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ref</TableCell>
                <TableCell>Passenger</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Fare</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {onDemand.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{r.requestRef}</TableCell>
                  <TableCell>
                    <MuiLink component={Link} to={`/users/${r.passengerId?._id}`}>
                      {r.passengerId?.name}
                    </MuiLink>
                  </TableCell>
                  <TableCell>
                    <MuiLink component={Link} to={`/users/${r.acceptedDriverId?._id}`}>
                      {r.acceptedDriverId?.name || '—'}
                    </MuiLink>
                  </TableCell>
                  <TableCell>Rs.{r.agreedFare ?? r.passengerOfferedFare}</TableCell>
                  <TableCell>
                    <StatusChip status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <h3 className="text-sm font-bold text-slate-300 mb-2">Carpool bookings</h3>
      <Paper className="admin-card overflow-hidden" elevation={0}>
        {loading ? (
          <Skeleton height={200} />
        ) : carpool.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm">No carpool bookings.</p>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ref</TableCell>
                <TableCell>Passenger</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Seats</TableCell>
                <TableCell>Fare</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carpool.map((b) => (
                <TableRow key={b._id}>
                  <TableCell className="font-mono text-xs">{b.bookingRef || b._id.slice(-6)}</TableCell>
                  <TableCell>
                    <MuiLink component={Link} to={`/users/${b.passengerId?._id}`}>
                      {b.passengerId?.name}
                    </MuiLink>
                  </TableCell>
                  <TableCell>{b.rideId?.driverId?.name}</TableCell>
                  <TableCell>{b.seatsBooked}</TableCell>
                  <TableCell>Rs.{b.farePaid}</TableCell>
                  <TableCell>
                    <StatusChip status={b.status} />
                  </TableCell>
                  <TableCell align="right">
                    {b.status !== 'CANCELLED' && (
                      <Button
                        size="small"
                        color="error"
                        onClick={async () => {
                          await api.patch(endpoints.cancelBooking(b._id), { reason: 'Admin' });
                          load();
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </div>
  );
}
