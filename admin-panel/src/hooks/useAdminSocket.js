import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { setRealtime } from '@/store/slices/dashboardSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useAdminSocket() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      socket.emit('admin-join', { token });
    });
    socket.on('admin-realtime', (payload) => {
      dispatch(setRealtime(payload));
    });
    socket.on('admin-connected', () => {
      socket.emit('admin-heartbeat');
    });

    const events = [
      'user-status-changed',
      'booking-cancelled',
      'ride-cancelled',
      'report-resolved',
      'verification-reviewed',
      'driver-approved',
      'announcement-sent'
    ];
    events.forEach((ev) => {
      socket.on(ev, (payload) => {
        dispatch(setRealtime({ lastEvent: ev, ...payload, at: new Date() }));
      });
    });

    return () => socket.disconnect();
  }, [token, dispatch]);
}
