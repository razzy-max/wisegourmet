import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cartApi } from '../api/cartApi';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [cartPulse, setCartPulse] = useState(0);
  const latestRefreshRequestId = useRef(0);

  const refreshCartCount = useCallback(async () => {
    const requestId = ++latestRefreshRequestId.current;

    if (!isAuthenticated || user?.role !== 'customer') {
      if (requestId === latestRefreshRequestId.current) {
        setCartCount(0);
      }
      return;
    }

    try {
      const response = await cartApi.get();
      const count = (response.cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      if (requestId === latestRefreshRequestId.current) {
        setCartCount(count);
      }
    } catch {
      if (requestId === latestRefreshRequestId.current) {
        setCartCount(0);
      }
    }
  }, [isAuthenticated, user?.role]);

  const triggerCartPulse = useCallback(() => {
    setCartPulse((value) => value + 1);
  }, []);

  const adjustCartCount = useCallback((delta) => {
    setCartCount((currentCount) => Math.max(0, currentCount + Number(delta || 0)));
  }, []);

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  const value = useMemo(
    () => ({
      cartCount,
      cartPulse,
      refreshCartCount,
      adjustCartCount,
      triggerCartPulse,
    }),
    [cartCount, cartPulse, adjustCartCount, refreshCartCount, triggerCartPulse]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
