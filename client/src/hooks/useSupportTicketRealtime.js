import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useSupportTicketRealtime(onChange, options = {}) {
  const { ticketId = null } = options;

  useEffect(() => {
    const socket = getSocket();

    const handleTicketChanged = (payload) => {
      if (!ticketId || payload?.ticketId === ticketId) {
        onChange();
      }
    };

    socket.on('support:tickets:changed', handleTicketChanged);
    socket.on('support-ticket:changed', handleTicketChanged);

    if (ticketId) {
      socket.emit('support-ticket:watch', ticketId);
    }

    return () => {
      socket.off('support:tickets:changed', handleTicketChanged);
      socket.off('support-ticket:changed', handleTicketChanged);
      if (ticketId) {
        socket.emit('support-ticket:unwatch', ticketId);
      }
    };
  }, [onChange, ticketId]);
}