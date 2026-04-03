import { apiRequest } from './http';

export const supportApi = {
  createTicket(payload) {
    return apiRequest('/support/tickets', { method: 'POST', body: payload });
  },
  myTickets() {
    return apiRequest('/support/tickets/my');
  },
  allTickets() {
    return apiRequest('/support/tickets');
  },
  getTicket(id) {
    return apiRequest(`/support/tickets/${id}`);
  },
  addMessage(id, payload) {
    return apiRequest(`/support/tickets/${id}/messages`, { method: 'POST', body: payload });
  },
  rateTicket(id, payload) {
    return apiRequest(`/support/tickets/${id}/rating`, { method: 'POST', body: payload });
  },
  updateTicket(id, payload) {
    return apiRequest(`/support/tickets/${id}`, { method: 'PATCH', body: payload });
  },
};
