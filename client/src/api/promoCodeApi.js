import { apiRequest } from './http';

export const promoCodeApi = {
  listAdmin() {
    return apiRequest('/promo-codes');
  },
  create(payload) {
    return apiRequest('/promo-codes', { method: 'POST', body: payload });
  },
  update(id, payload) {
    return apiRequest(`/promo-codes/${id}`, { method: 'PATCH', body: payload });
  },
  remove(id) {
    return apiRequest(`/promo-codes/${id}`, { method: 'DELETE' });
  },
};
