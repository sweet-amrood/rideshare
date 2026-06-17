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
  Skeleton,
  Link as MuiLink
} from '@mui/material';
import { Link } from 'react-router-dom';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';

const BUCKETS = ['ongoing', 'completed', 'searching', ''];

export default function RidesPage() {
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const bucket = BUCKETS[tab];
    const { data } = await api.get(endpoints.rides, {
      params: bucket ? { bucket } : {}
    });
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tab]);

  return (
    <div>
      <PageHeader
        title="On-demand rides"
        subtitle="Live ride requests — ongoing, searching, and completed trips"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} className="mb-4">
        <Tab label="Ongoing" />
        <Tab label="Completed" />
        <Tab label="Searching" />
        <Tab label="All" />
      </Tabs>
      <Paper className="admin-card overflow-hidden" elevation={0}>
        {loading ? (
          <Skeleton height={300} />
        ) : items.length === 0 ? (
          <p className="p-6 text-slate-500 text-sm">No rides in this category.</p>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ref</TableCell>
                <TableCell>Passenger</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Fare</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{r.requestRef || r._id.slice(-6)}</TableCell>
                  <TableCell>
                    <MuiLink component={Link} to={`/users/${r.passengerId?._id || r.passengerId}`}>
                      {r.passengerId?.name || '—'}
                    </MuiLink>
                    <br />
                    <span className="text-xs text-slate-500">{r.passengerId?.email}</span>
                  </TableCell>
                  <TableCell>
                    {r.acceptedDriverId ? (
                      <>
                        <MuiLink
                          component={Link}
                          to={`/users/${r.acceptedDriverId?._id || r.acceptedDriverId}`}
                        >
                          {r.acceptedDriverId?.name}
                        </MuiLink>
                        <br />
                        <span className="text-xs text-slate-500">{r.acceptedDriverId?.email}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{r.vehicleType}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {r.pickup?.address} → {r.dropoff?.address}
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
    </div>
  );
}
