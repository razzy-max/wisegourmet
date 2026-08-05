import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useOrderLocationRealtime(onLocation, { orderId }) {
  useEffect(() => {
    if (!orderId) return undefined;

    const socket = getSocket();
    const join = () => socket.emit('order:watch', orderId);

    const handleLocationChanged = (payload) => {
      if (payload?.orderId === orderId) {
        onLocation(payload);
      }
    };

    socket.on('order-location:changed', handleLocationChanged);
    // Socket.IO room membership does not survive a reconnect, so rejoin every
    // time the transport (re)connects, not just once on mount.
    socket.on('connect', join);
    join();

    return () => {
      socket.off('order-location:changed', handleLocationChanged);
      socket.off('connect', join);
      socket.emit('order:unwatch', orderId);
    };
  }, [onLocation, orderId]);
}
