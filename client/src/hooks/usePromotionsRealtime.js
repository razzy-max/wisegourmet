import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function usePromotionsRealtime(onChange) {
  useEffect(() => {
    const socket = getSocket();

    const handlePromotionsChanged = () => {
      onChange();
    };

    socket.on('promotions:changed', handlePromotionsChanged);

    return () => {
      socket.off('promotions:changed', handlePromotionsChanged);
    };
  }, [onChange]);
}
