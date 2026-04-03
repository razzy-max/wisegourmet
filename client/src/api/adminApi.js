import { apiRequest } from './http';

export const adminApi = {
  getOverviewStats(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return apiRequest(`/admin/stats/overview${query ? `?${query}` : ''}`);
  },
};
