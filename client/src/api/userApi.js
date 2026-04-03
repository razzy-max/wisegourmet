import { apiRequest } from './http';

export const userApi = {
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
};
