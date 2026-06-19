import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

export const notificationService = {
  list: (params = {}) =>
    api.get(endpoints.notifications.list, { params }).then((r) => r.data),

  markRead: (id) =>
    api.patch(endpoints.notifications.markRead(id)).then((r) => r.data),

  markAllRead: () =>
    api.patch(endpoints.notifications.markAllRead).then((r) => r.data)
};
