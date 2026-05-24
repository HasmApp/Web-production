import { useState, useEffect, useRef } from 'react';
import { fetchProducts } from '../services/api.js';
import config from '../config/config.js';
import { applyProductPriceUpdate, parsePriceWsMessage } from '../utils/productCatalogLive.js';

/**
 * Product catalog with HTTP refresh + `/ws/prices` ticks — shared by Home and Cart.
 */
export default function useLiveProductCatalog({ enabled = true, pollMs = 30000 } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchProducts();
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : data?.items || []);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const poll = setInterval(load, pollMs);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [enabled, pollMs]);

  useEffect(() => {
    if (!enabled) return undefined;

    const token = localStorage.getItem('accessToken');
    const wsUrl = token
      ? `${config.wsBaseUrl}/ws/prices?token=${encodeURIComponent(token)}`
      : `${config.wsBaseUrl}/ws/prices`;

    let ws = null;
    let dead = false;

    const timer = setTimeout(() => {
      if (dead) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
          const update = parsePriceWsMessage(e.data);
          if (!update) return;
          setProducts((prev) => applyProductPriceUpdate(prev, update));
        };
        ws.onerror = () => {};
        wsRef.current = ws;
      } catch {
        /* ignore */
      }
    }, 300);

    return () => {
      dead = true;
      clearTimeout(timer);
      ws?.close();
      wsRef.current = null;
    };
  }, [enabled]);

  return { products, loading, setProducts };
}
