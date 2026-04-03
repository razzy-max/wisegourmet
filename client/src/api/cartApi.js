import { apiRequest } from './http';

export const cartApi = {
  get() {
    return apiRequest('/cart');
  },
  add(menuItemId, quantity = 1) {
    return apiRequest('/cart/items', {
      method: 'POST',
      body: { menuItemId, quantity },
    });
  },
  update(itemId, quantity) {
    return apiRequest(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: { quantity },
    });
  },
  remove(itemId) {
    return apiRequest(`/cart/items/${itemId}`, { method: 'DELETE' });
  },
  clear() {
    return apiRequest('/cart/clear', { method: 'DELETE' });
  },
};
