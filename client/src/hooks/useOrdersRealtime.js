import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useOrdersRealtime(onChange, options = {}) {
  const { orderId = null } = options;

  useEffect(() => {
    const socket = getSocket();

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

    if (orderId) {
      socket.emit('order:watch', orderId);
    }

    return () => {
      socket.off('orders:changed', handleOrdersChanged);
      socket.off('order:changed', handleOrderChanged);
      if (orderId) {
        socket.emit('order:unwatch', orderId);
      }
    };
  }, [onChange, orderId]);
}
