import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useOrderLocationRealtime(onLocation, { orderId }) {
  useEffect(() => {
    if (!orderId) return undefined;

    const socket = getSocket();

    const handleLocationChanged = (payload) => {
      if (payload?.orderId === orderId) {
        onLocation(payload);
      }
    };

    socket.on('order-location:changed', handleLocationChanged);
    socket.emit('order:watch', orderId);

    return () => {
      socket.off('order-location:changed', handleLocationChanged);
      socket.emit('order:unwatch', orderId);
    };
  }, [onLocation, orderId]);
}
