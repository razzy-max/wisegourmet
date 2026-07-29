import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useMenuRealtime(onChange) {
  useEffect(() => {
    const socket = getSocket();

    const handleMenuChanged = () => {
      onChange();
    };

    socket.on('menu:changed', handleMenuChanged);

    return () => {
      socket.off('menu:changed', handleMenuChanged);
    };
  }, [onChange]);
}
