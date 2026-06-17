import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Alert, CircularProgress, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import UserVerificationReview from '@/components/verification/UserVerificationReview';

export default function VerificationReviewPage() {
  const { userId } = useParams();
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
    setError('');
    try {
      const { data: res } = await api.get(endpoints.user(userId));
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load verification');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

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
        <Button component={Link} to="/verifications">
          Back to queue
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/verifications')}
        className="!mb-4"
      >
        Back to verification queue
      </Button>

      <PageHeader
        title="Review verification"
        subtitle={`${data.user.name} — all documents in one review`}
      />

      <UserVerificationReview
        userId={userId}
        data={data}
        onReload={load}
        onReviewSuccess={() => {
          setTimeout(() => navigate('/verifications'), 1500);
        }}
      />
    </div>
  );
}
