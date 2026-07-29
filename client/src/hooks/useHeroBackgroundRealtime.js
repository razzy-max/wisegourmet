import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useHeroBackgroundRealtime(onChange) {
  useEffect(() => {
    const socket = getSocket();

    const handleHeroBackgroundChanged = () => {
      onChange();
    };

    socket.on('hero-background:changed', handleHeroBackgroundChanged);

    return () => {
      socket.off('hero-background:changed', handleHeroBackgroundChanged);
    };
  }, [onChange]);
}
