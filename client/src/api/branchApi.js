import { apiRequest } from './http';

export const branchApi = {
  list() {
    return apiRequest('/branches');
  },
  listAdmin() {
    return apiRequest('/branches/admin');
  },
  create(payload) {
    return apiRequest('/branches', { method: 'POST', body: payload });
  },
  update(id, payload) {
    return apiRequest(`/branches/${id}`, { method: 'PUT', body: payload });
  },
  reorder(orderedIds) {
    return apiRequest('/branches/reorder', { method: 'PATCH', body: { orderedIds } });
  },
  remove(id) {
    return apiRequest(`/branches/${id}`, { method: 'DELETE' });
  },
  getSettings() {
    return apiRequest('/branches/settings');
  },
  updateSettings(enabled) {
    return apiRequest('/branches/settings', { method: 'PATCH', body: { enabled } });
  },
};
