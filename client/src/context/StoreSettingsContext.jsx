import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storeSettingsApi } from '../api/storeSettingsApi';
import { useStoreSettingsRealtime } from '../hooks/useStoreSettingsRealtime';

const DEFAULT_STORE_NAME = 'Store Name';

const StoreSettingsContext = createContext({ storeName: DEFAULT_STORE_NAME, refresh: () => {} });

export function StoreSettingsProvider({ children }) {
  const [storeName, setStoreName] = useState(DEFAULT_STORE_NAME);

  const refresh = useCallback(async () => {
    try {
      const response = await storeSettingsApi.get();
      if (response.storeName) {
        setStoreName(response.storeName);
      }
    } catch {
      // Keep whatever name is already showing rather than blanking it out.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useStoreSettingsRealtime(
    useCallback((payload) => {
      if (payload?.storeName) {
        setStoreName(payload.storeName);
      } else {
        refresh();
      }
    }, [refresh])
  );

  return (
    <StoreSettingsContext.Provider value={{ storeName, refresh }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreName() {
  return useContext(StoreSettingsContext).storeName;
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}
