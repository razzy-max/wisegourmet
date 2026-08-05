import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useSupportTicketRealtime(onChange, options = {}) {
  const { ticketId = null } = options;

  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      if (ticketId) socket.emit('support-ticket:watch', ticketId);
    };

    const handleTicketChanged = (payload) => {
      if (!ticketId || payload?.ticketId === ticketId) {
        onChange();
      }
    };

    socket.on('support:tickets:changed', handleTicketChanged);
    socket.on('support-ticket:changed', handleTicketChanged);
    // Socket.IO room membership does not survive a reconnect, so rejoin every
    // time the transport (re)connects, not just once on mount.
    socket.on('connect', join);
    join();

    return () => {
      socket.off('support:tickets:changed', handleTicketChanged);
      socket.off('support-ticket:changed', handleTicketChanged);
      socket.off('connect', join);
      if (ticketId) {
        socket.emit('support-ticket:unwatch', ticketId);
      }
    };
  }, [onChange, ticketId]);
}