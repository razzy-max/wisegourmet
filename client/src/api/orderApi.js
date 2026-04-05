import { apiRequest } from './http';

export const orderApi = {
  create(payload) {
    return apiRequest('/orders', { method: 'POST', body: payload });
  },
  deliveryZones() {
    return apiRequest('/orders/delivery-zones');
  },
  myOrders() {
    return apiRequest('/orders/my');
  },
  allOrders() {
    return apiRequest('/orders');
  },
  riderOrders() {
    return apiRequest('/orders/rider/my');
  },
  riderQueue() {
    return apiRequest('/orders/rider/queue');
  },
  acceptRiderOrder(id) {
    return apiRequest(`/orders/${id}/rider/accept`, { method: 'PATCH' });
  },
  verifyDeliveryPin(id, pin) {
    return apiRequest(`/orders/${id}/rider/verify-pin`, {
      method: 'PATCH',
      body: { pin },
    });
  },
  assignRider(id, riderId) {
    return apiRequest(`/orders/${id}/assign-rider`, {
      method: 'PATCH',
      body: { riderId },
    });
  },
  initiatePayment(id) {
    return apiRequest(`/orders/${id}/payment/initiate`, { method: 'POST' });
  },
  verifyPayment(id, reference) {
    return apiRequest(`/orders/${id}/payment/verify`, {
      method: 'POST',
      body: { reference },
    });
  },
  getOrder(id) {
    return apiRequest(`/orders/${id}`);
  },
  updateStatus(id, payload) {
    return apiRequest(`/orders/${id}/status`, { method: 'PATCH', body: payload });
  },
};
