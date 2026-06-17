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
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';

export default function UsersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(endpoints.users, {
        params: { page: page + 1, limit: rowsPerPage, search, role, accountStatus: status }
      });
      setData({ items: res.items, total: res.total });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, rowsPerPage, role, status]);

  const openUser = (id) => navigate(`/users/${id}`);

  return (
    <div>
      <PageHeader
        title="User management"
        subtitle="One row per user — click to review documents, approve or reject with email notice"
      />
      <Paper className="admin-card p-4 mb-4 flex flex-wrap gap-3" elevation={0}>
        <TextField
          size="small"
          placeholder="Search name, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <TextField
          select
          size="small"
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="RIDER">Rider</MenuItem>
          <MenuItem value="DRIVER">Driver</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="SUSPENDED">Suspended</MenuItem>
          <MenuItem value="BANNED">Banned</MenuItem>
        </TextField>
        <Button variant="contained" onClick={() => { setPage(0); load(); }}>
          Search
        </Button>
      </Paper>
      <Paper className="admin-card overflow-hidden" elevation={0}>
        {loading ? (
          <Skeleton height={300} />
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Documents</TableCell>
                  <TableCell>Verification</TableCell>
                  <TableCell>Trust</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((u) => (
                  <TableRow
                    key={u._id}
                    hover
                    className="cursor-pointer"
                    onClick={() => openUser(u._id)}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{u.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {u.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{u.roles?.join(', ')}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        className="flex items-center gap-1 max-w-[280px] truncate"
                        title={u.documentsSummary}
                      >
                        <FolderOpenIcon sx={{ fontSize: 16, color: '#818cf8' }} />
                        {u.documentsSummary || 'No documents'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={u.verification?.status || 'UNVERIFIED'} />
                    </TableCell>
                    <TableCell>{u.trustScore ?? 100}</TableCell>
                    <TableCell>
                      <StatusChip status={u.accountStatus || 'ACTIVE'} />
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
