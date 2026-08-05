import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useOrdersRealtime(onChange, options = {}) {
  const { orderId = null } = options;

  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      if (orderId) socket.emit('order:watch', orderId);
    };

    const handleOrdersChanged = () => {
      onChange();
    };

    const handleOrderChanged = (payload) => {
      if (!orderId || payload?.orderId === orderId) {
        onChange();
      }
    };

    socket.on('orders:changed', handleOrdersChanged);
    socket.on('order:changed', handleOrderChanged);
    // Socket.IO room membership does not survive a reconnect, so rejoin every
    // time the transport (re)connects, not just once on mount.
    socket.on('connect', join);
    join();

    return () => {
      socket.off('orders:changed', handleOrdersChanged);
      socket.off('order:changed', handleOrderChanged);
      socket.off('connect', join);
      if (orderId) {
        socket.emit('order:unwatch', orderId);
      }
    };
  }, [onChange, orderId]);
}
