import { io } from 'socket.io-client';
import { API_BASE } from '../api/http';

const SOCKET_SERVER_URL = API_BASE.replace(/\/api$/, '');

let socketInstance;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
  }

  return socketInstance;
}
