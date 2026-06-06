import { useState, useEffect, useRef } from 'react';
import { fetchProducts } from '../services/api.js';
import {
  applyProductPriceUpdate,
  attachPageResumeHandlers,
  connectPriceWebSocket,
} from '../utils/productCatalogLive.js';

/**
 * Product catalog with HTTP refresh + `/ws/prices` ticks — shared by Home, Deals, and Cart.
 * Reconnects WS after idle/tab sleep and polls faster when the stream is unhealthy.
 */
export default function useLiveProductCatalog({ enabled = true, pollMs = 30000 } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsHealthyRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let pollTimer = null;

    const load = async ({ soft = false } = {}) => {
      try {
        const data = await fetchProducts();
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : data?.items || []);
        }
      } catch {
        if (!cancelled && !soft) setProducts([]);
      } finally {
        if (!cancelled && !soft) setLoading(false);
      }
    };

    const schedulePoll = () => {
      if (cancelled) return;
      const ms = document.hidden
        ? Math.max(pollMs, 25000)
        : (wsHealthyRef.current ? pollMs : Math.min(pollMs, 4000));
      pollTimer = setTimeout(async () => {
        await load({ soft: true });
        schedulePoll();
      }, ms);
    };

    load();
    schedulePoll();

    const onResume = () => { load({ soft: true }); };
    const detachResume = attachPageResumeHandlers(onResume);

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      detachResume();
    };
  }, [enabled, pollMs]);

  useEffect(() => {
    if (!enabled) return undefined;

    const dispose = connectPriceWebSocket({
      onHealthChange: (healthy) => {
        wsHealthyRef.current = healthy;
      },
      onPriceUpdate: (update) => {
        setProducts((prev) => applyProductPriceUpdate(prev, update));
      },
    });

    return dispose;
  }, [enabled]);

  return { products, loading, setProducts };
}
