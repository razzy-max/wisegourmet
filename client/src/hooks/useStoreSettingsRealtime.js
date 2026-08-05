import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useStoreSettingsRealtime(onChange) {
  useEffect(() => {
    const socket = getSocket();

    const handleStoreSettingsChanged = (payload) => {
      onChange(payload);
    };

    socket.on('store-settings:changed', handleStoreSettingsChanged);

    return () => {
      socket.off('store-settings:changed', handleStoreSettingsChanged);
    };
  }, [onChange]);
}
