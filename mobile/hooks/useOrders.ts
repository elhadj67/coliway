import { useState, useEffect, useCallback } from 'react';
import {
  getClientOrders,
  getLivreurOrders,
  getAvailableOrders,
  Order,
} from '@/services/orders';
import { UserRole } from '@/constants/config';

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  refresh: () => void;
}

/**
 * Hook that subscribes to orders based on the user's role.
 * - For 'client': subscribes to the client's orders.
 * - For 'livreur': subscribes to the livreur's assigned orders.
 * - For 'admin': subscribes to all available (pending) orders.
 *
 * Returns the orders list, loading state, and a refresh function.
 */
export function useOrders(userId: string, role: UserRole): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const handleOrders = (fetchedOrders: Order[]) => {
      setOrders(fetchedOrders);
      setLoading(false);
    };

    let unsubscribe: (() => void) | undefined;

    switch (role) {
      case 'client':
        unsubscribe = getClientOrders(userId, handleOrders);
        break;
      case 'livreur':
        unsubscribe = getLivreurOrders(userId, handleOrders);
        break;
      case 'admin':
        unsubscribe = getAvailableOrders(handleOrders);
        break;
      default:
        setOrders([]);
        setLoading(false);
        break;
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, role, refreshKey]);

  return { orders, loading, refresh };
}
