import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ordersRepo } from '../lib/data/repository';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Number of orders past their delivery date that are not delivered yet, for
 * the Orders tab badge. Read-only (uses ordersRepo.list); re-reads whenever
 * `refreshKey` changes, which the tab bar ties to navigation so returning from
 * an order or the list refreshes it.
 */
export function useLateOrderCount(refreshKey: string): number {
  const { shop } = useAuth();
  const shopId = shop?.id;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;
    ordersRepo
      .list(shopId)
      .then((rows) => {
        if (cancelled) return;
        const today = todayKey();
        setCount(rows.filter((o) => o.status !== 'delivered' && !!o.delivery_date && o.delivery_date.slice(0, 10) < today).length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [shopId, refreshKey]);

  return count;
}
