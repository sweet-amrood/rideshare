import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Button,
  Typography,
  Skeleton,
  TablePagination
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RateReviewIcon from '@mui/icons-material/RateReview';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';

export default function VerificationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(endpoints.verificationUsers, {
        params: {
          status: status || undefined,
          search: search || undefined,
          page: page + 1,
          limit: rowsPerPage
        }
      });
      setData({ items: res.items || [], total: res.total || 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, rowsPerPage, status]);

  const openReview = (userId) => navigate(`/verifications/review/${userId}`);

  return (
    <div>
      <PageHeader
        title="Document verification"
        subtitle="One row per user — all documents in one column. Click Review to open the full review page."
      />
      <Paper className="admin-card p-4 mb-4 flex flex-wrap gap-3" elevation={0}>
        <TextField
          size="small"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="PENDING">Pending review</MenuItem>
          <MenuItem value="APPROVED">Approved</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
          <MenuItem value="">All with documents</MenuItem>
        </TextField>
        <Button variant="contained" onClick={() => { setPage(0); load(); }}>
          Search
        </Button>
      </Paper>

      <Paper className="admin-card overflow-hidden" elevation={0}>
        {loading ? (
          <Skeleton height={320} />
        ) : data.items.length === 0 ? (
          <Typography className="p-8 text-center text-slate-400">No users in this queue.</Typography>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Documents</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow
                    key={row._id}
                    hover
                    className="cursor-pointer"
                    onClick={() => openReview(row._id)}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{row.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        className="flex items-center gap-1 max-w-md"
                        title={row.documentsSummary}
                      >
                        <FolderOpenIcon sx={{ fontSize: 18, color: '#818cf8' }} />
                        <span className="truncate">{row.documentsSummary}</span>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={row.verificationStatus} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleDateString()
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<RateReviewIcon />}
                        onClick={() => openReview(row._id)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            />
          </>
        )}
      </Paper>
    </div>
  );
}
