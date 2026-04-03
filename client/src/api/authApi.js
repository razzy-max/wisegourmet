import { apiRequest } from './http';

export const authApi = {
  register(payload) {
    return apiRequest('/auth/register', { method: 'POST', body: payload });
  },
  login(payload) {
    return apiRequest('/auth/login', { method: 'POST', body: payload });
  },
  me() {
    return apiRequest('/auth/me');
  },
  changePassword(payload) {
    return apiRequest('/auth/change-password', { method: 'PATCH', body: payload });
  },
  updateProfile(payload) {
    return apiRequest('/auth/profile', { method: 'PATCH', body: payload });
  },
};
