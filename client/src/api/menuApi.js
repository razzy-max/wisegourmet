import { apiRequest } from './http';

export const menuApi = {
  list(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return apiRequest(`/menu${query ? `?${query}` : ''}`);
  },
  categories() {
    return apiRequest('/menu/categories');
  },
  createCategory(payload) {
    return apiRequest('/menu/categories', { method: 'POST', body: payload });
  },
  updateCategory(id, payload) {
    return apiRequest(`/menu/categories/${id}`, { method: 'PUT', body: payload });
  },
  deleteCategory(id) {
    return apiRequest(`/menu/categories/${id}`, { method: 'DELETE' });
  },
  createItem(payload) {
    return apiRequest('/menu', { method: 'POST', body: payload });
  },
  updateItem(id, payload) {
    return apiRequest(`/menu/${id}`, { method: 'PUT', body: payload });
  },
  deleteItem(id) {
    return apiRequest(`/menu/${id}`, { method: 'DELETE' });
  },
};
