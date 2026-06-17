import { useState } from 'react';
import { Paper, TextField, MenuItem, Button, Typography } from '@mui/material';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import PageHeader from '@/components/common/PageHeader';

export default function NotificationsPage() {
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'ANNOUNCEMENT',
    targetRoles: ['ALL']
  });
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    await api.post(endpoints.announce, {
      ...form,
      targetRoles: form.targetRoles[0] === 'ALL' ? ['ALL'] : [form.targetRoles[0]]
    });
    setSent(true);
    setForm({ title: '', body: '', type: 'ANNOUNCEMENT', targetRoles: ['ALL'] });
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Platform announcements, safety alerts, maintenance & verification updates"
      />
      <Paper className="admin-card p-6 max-w-lg" elevation={0} component="form" onSubmit={submit}>
        {sent && (
          <Typography color="success.main" className="mb-4">
            Announcement queued for delivery.
          </Typography>
        )}
        <TextField
          fullWidth
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="!mb-4"
        />
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Message"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
          className="!mb-4"
        />
        <TextField
          select
          fullWidth
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="!mb-4"
        >
          <MenuItem value="ANNOUNCEMENT">Announcement</MenuItem>
          <MenuItem value="SAFETY">Safety alert</MenuItem>
          <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
          <MenuItem value="VERIFICATION">Verification</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Audience"
          value={form.targetRoles[0]}
          onChange={(e) => setForm({ ...form, targetRoles: [e.target.value] })}
          className="!mb-6"
        >
          <MenuItem value="ALL">All users</MenuItem>
          <MenuItem value="RIDER">Passengers</MenuItem>
          <MenuItem value="DRIVER">Drivers</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" fullWidth>
          Send notification
        </Button>
      </Paper>
    </div>
  );
}
