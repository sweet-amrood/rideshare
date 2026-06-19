import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppSocket } from '@/hooks/useAppSocket';
import { notificationService } from '@/api/services/notification.service';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await notificationService.list({ limit: 50 });
      setItems(res.data || []);
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    refresh();
  }, [user?._id, refresh]);

  const pushNotification = useCallback((n) => {
    if (!n) return;
    setItems((prev) => {
      if (n._id && prev.some((x) => x._id === n._id)) return prev;
      return [n, ...prev].slice(0, 80);
    });
    if (!n.read) setUnreadCount((c) => c + 1);
  }, []);

  const socketHandlers = useMemo(
    () => ({
      'notification:new': (payload) => pushNotification(payload)
    }),
    [pushNotification]
  );

  useAppSocket(socketHandlers);

  const markRead = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await notificationService.markRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const res = await notificationService.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, []);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      pushNotification
    }),
    [items, unreadCount, loading, refresh, markRead, markAllRead, pushNotification]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
