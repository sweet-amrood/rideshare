import { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

/** In dev, connect to the API host directly to avoid Vite ws-proxy ECONNABORTED log spam. */
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '');

export function useAppSocket(handlers = {}) {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const pendingRoomRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const joinRideRequestRoom = useCallback(
    (requestId) => {
      if (!requestId) return;
      pendingRoomRef.current = requestId;
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('join-ride-request-room', { requestId, userId: user?._id });
      }
    },
    [user?._id]
  );

  useEffect(() => {
    if (!user?._id || !token) return undefined;

    const url = SOCKET_URL || window.location.origin;
    const socket = io(url, { transports: ['websocket', 'polling'], auth: { token } });
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit('user-join', { userId: user._id });
      if (pendingRoomRef.current) {
        socket.emit('join-ride-request-room', {
          requestId: pendingRoomRef.current,
          userId: user._id
        });
      }
    };
    socket.on('connect', onConnect);

    const bound = [];
    Object.keys(handlersRef.current || {}).forEach((ev) => {
      const fn = (payload) => handlersRef.current[ev]?.(payload);
      socket.on(ev, fn);
      bound.push({ ev, fn });
    });

    return () => {
      socket.off('connect', onConnect);
      bound.forEach(({ ev, fn }) => socket.off(ev, fn));
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id, token]);

  const emitDriverLocation = (lat, lng) => {
    socketRef.current?.emit('driver-location-update', { lat, lng });
  };

  const emitRideRequestLocation = (requestId, lat, lng) => {
    socketRef.current?.emit('ride-request-location', { requestId, lat, lng });
  };

  const getSocket = () => socketRef.current;

  return {
    emitDriverLocation,
    emitRideRequestLocation,
    joinRideRequestRoom,
    getSocket
  };
}
