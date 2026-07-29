import { apiRequest } from './http';

export const userApi = {
  listCustomers() {
    return apiRequest('/users/customers');
  },
  sendReEngagementMessage(payload) {
    return apiRequest('/users/customers/notify', { method: 'POST', body: payload });
  },
  getReengagementSettings() {
    return apiRequest('/users/reengagement-settings');
  },
  updateReengagementSettings(payload) {
    return apiRequest('/users/reengagement-settings', { method: 'PUT', body: payload });
  },
  riders() {
    return apiRequest('/users/riders');
  },
  listTeam() {
    return apiRequest('/users/team');
  },
  createTeamMember(payload) {
    return apiRequest('/users/team', { method: 'POST', body: payload });
  },
  deleteTeamMember(id) {
    return apiRequest(`/users/team/${id}`, { method: 'DELETE' });
  },
  resetTeamMemberPassword(id, newPassword) {
    return apiRequest(`/users/team/${id}/password`, {
      method: 'PATCH',
      body: { newPassword },
    });
  },
  notificationConfig() {
    return apiRequest('/users/notifications/config');
  },
  notificationStatus(endpoint = '') {
    const query = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : '';
    return apiRequest(`/users/notifications/status${query}`);
  },
  subscribeNotifications(subscription) {
    return apiRequest('/users/notifications/subscribe', {
      method: 'POST',
      body: { subscription },
    });
  },
  unsubscribeNotifications(endpoint = '') {
    return apiRequest('/users/notifications/unsubscribe', {
      method: 'POST',
      body: { endpoint },
    });
  },
};
