import { apiRequest } from './http';

export const adminApi = {
  getOverviewStats(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return apiRequest(`/admin/stats/overview${query ? `?${query}` : ''}`);
  },
  getDeliveryZones() {
    return apiRequest('/admin/delivery-zones');
  },
  createDeliveryZone(payload) {
    return apiRequest('/admin/delivery-zones', { method: 'POST', body: payload });
  },
  updateDeliveryZone(id, payload) {
    return apiRequest(`/admin/delivery-zones/${id}`, { method: 'PATCH', body: payload });
  },
  deleteDeliveryZone(id) {
    return apiRequest(`/admin/delivery-zones/${id}`, { method: 'DELETE' });
  },
};
