import { apiRequest } from './http';

export const storeSettingsApi = {
  get() {
    return apiRequest('/store-settings');
  },
  update(payload) {
    return apiRequest('/store-settings', { method: 'PUT', body: payload });
  },
};
