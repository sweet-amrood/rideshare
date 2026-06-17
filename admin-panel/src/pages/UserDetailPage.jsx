import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Alert, CircularProgress, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import UserVerificationReview from '@/components/verification/UserVerificationReview';

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (payload) => {
    if (payload) {
      setData(payload);
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get(endpoints.user(id));
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <Box className="flex justify-center py-24">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data?.user) {
    return (
      <Alert severity="error">
        {error || 'User not found'}{' '}
        <Button component={Link} to="/users">
          Back to users
        </Button>
      </Alert>
    );
  }

  const { user, documents } = data;

  return (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} className="!mb-4">
        Back to users
      </Button>

      <PageHeader
        title={user.name}
        subtitle={`${user.email} · ${user.phoneNumber}`}
        action={
          <Box className="flex gap-2">
            <StatusChip status={user.accountStatus || 'ACTIVE'} />
            <StatusChip status={documents?.status || user.verification?.status} />
          </Box>
        }
      />

      <UserVerificationReview userId={id} data={data} onReload={load} showAccountActions />
    </div>
  );
}
