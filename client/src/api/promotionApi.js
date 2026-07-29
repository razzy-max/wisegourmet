import { apiRequest } from './http';

export const promotionApi = {
  list() {
    return apiRequest('/promotions');
  },
  listAdmin() {
    return apiRequest('/promotions/admin');
  },
  create(payload) {
    return apiRequest('/promotions', { method: 'POST', body: payload });
  },
  update(id, payload) {
    return apiRequest(`/promotions/${id}`, { method: 'PATCH', body: payload });
  },
  remove(id) {
    return apiRequest(`/promotions/${id}`, { method: 'DELETE' });
  },
  reorder(orderedIds) {
    return apiRequest('/promotions/reorder', { method: 'PATCH', body: { orderedIds } });
  },
};
