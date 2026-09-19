import { io } from 'socket.io-client';
import { API_BASE } from '../api/http';
import { authStorage } from '../utils/authStorage';

const SOCKET_SERVER_URL = API_BASE.replace(/\/api$/, '');

let socketInstance;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: { token: authStorage.getToken() },
    });
  }

  return socketInstance;
}

// Re-scopes the current socket to whichever account is now logged in (or
// anonymous), without forcing a reconnect — mirrors the existing
// order:watch/support-ticket:watch pattern already used elsewhere.
export function identifySocket(token) {
  getSocket().emit('identify', token || '');
}

export function deidentifySocket() {
  getSocket().emit('deidentify');
}
