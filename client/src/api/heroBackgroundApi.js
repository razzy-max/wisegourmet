import { apiRequest } from './http';

export const heroBackgroundApi = {
  get() {
    return apiRequest('/hero-background');
  },
  update(payload) {
    return apiRequest('/hero-background', { method: 'PUT', body: payload });
  },
};
