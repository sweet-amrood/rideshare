import { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';
import { toPreviewUrl } from '@/utils/documentPreview';

const TABS = ['all', 'pending', 'active', 'blocked'];

const DOC_BUTTONS = [
  { key: 'cnicUrl', title: 'CNIC' },
  { key: 'selfieUrl', title: 'Selfie' },
  { key: 'licenseUrl', title: 'License' }
];

export default function DriversPage() {
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoints.drivers, {
        params: { status: TABS[tab], limit: 100 }
      });
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const openDoc = (url, title) => {
    if (!url?.trim()) return;
    setPreview({ url: toPreviewUrl(url), title });
  };

  return (
    <div>
      <PageHeader
        title="Driver management"
        subtitle="Everyone who registered as a driver or submitted vehicle & ID documents"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} className="mb-4">
        <Tab label="All drivers" />
        <Tab label="Pending review" />
        <Tab label="Active" />
        <Tab label="Blocked" />
      </Tabs>
      <Paper className="admin-card overflow-hidden" elevation={0}>
        {loading ? (
          <Skeleton height={280} />
        ) : items.length === 0 ? (
          <p className="p-6 text-slate-500 text-sm">No drivers in this list.</p>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Driver</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Verification</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Rides</TableCell>
                <TableCell>Documents</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d._id}>
                  <TableCell>
                    <MuiLink component={Link} to={`/users/${d._id}`}>
                      {d.name || '—'}
                    </MuiLink>
                    <br />
                    <span className="text-xs text-slate-500">{d.email}</span>
                  </TableCell>
                  <TableCell>
                    {(d.roles || []).join(', ') || '—'}
                    {d.driverApplicant && (
                      <span className="block text-[10px] text-amber-600">Applicant</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={d.verification?.status || 'PENDING'} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {d.driverApplicationSubmittedAt || d.driverSetup?.submittedAt
                      ? new Date(
                          d.driverApplicationSubmittedAt || d.driverSetup.submittedAt
                        ).toLocaleDateString()
                      : d.driverSetupComplete
                        ? 'Approved'
                        : '—'}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">
                      {d.rideStats?.ongoing ?? 0} ongoing · {d.rideStats?.completed ?? 0} done
                    </span>
                  </TableCell>
                  <TableCell>
                    {DOC_BUTTONS.map(({ key, title }) =>
                      d.verification?.[key] ? (
                        <Button
                          key={key}
                          size="small"
                          onClick={() => openDoc(d.verification[key], title)}
                        >
                          {title}
                        </Button>
                      ) : null
                    )}
                    <Button size="small" component={Link} to={`/users/${d._id}`}>
                      Review
                    </Button>
                  </TableCell>
                  <TableCell align="right">
                    {tab === 1 && d.verification?.status !== 'APPROVED' && (
                      <>
                        <Button
                          size="small"
                          color="success"
                          onClick={async () => {
                            await api.post(endpoints.approveDriver(d._id));
                            load();
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={async () => {
                            await api.post(endpoints.rejectDriver(d._id), {
                              reason: 'Incomplete or invalid documents'
                            });
                            load();
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
      <DocumentPreviewModal open={Boolean(preview)} onClose={() => setPreview(null)} {...preview} />
    </div>
  );
}
