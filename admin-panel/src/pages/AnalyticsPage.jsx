import { useEffect, useState } from 'react';
import { Paper, Typography, Grid, Skeleton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(endpoints.analytics).then((res) => {
      setData(res.data.data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Analytics & insights" subtitle="Growth, retention, peak hours, top organizations" />
      <Grid container spacing={2} className="mb-6">
        <Grid item xs={6} md={3}>
          <StatCard title="DAU (24h signups)" value={data?.dau} loading={loading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Rides this month" value={data?.monthlyRides} loading={loading} />
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper className="admin-card p-4" elevation={0}>
            <Typography fontWeight={700} className="mb-4">
              Top universities / companies
            </Typography>
            {!data ? (
              <Skeleton height={220} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topUniversities} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="_id" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper className="admin-card p-4" elevation={0}>
            <Typography fontWeight={700} className="mb-4">
              Peak departure hours
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.peakHours || []}>
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#22d3ee" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}
