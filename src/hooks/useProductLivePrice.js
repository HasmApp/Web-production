import { useEffect, useRef } from 'react';
import { fetchProductById } from '../services/api.js';
import {
  attachPageResumeHandlers,
  connectPriceWebSocket,
} from '../utils/productCatalogLive.js';

/**
 * Keep a single product's displayed price live (WS + resume refresh).
 */
export default function useProductLivePrice(productId, onPriceChange) {
  const onPriceRef = useRef(onPriceChange);
  onPriceRef.current = onPriceChange;

  useEffect(() => {
    if (!productId) return undefined;
    const pid = String(productId);
    let pollTimer = null;
    let cancelled = false;

    const refresh = async () => {
      try {
        const data = await fetchProductById(productId);
        if (cancelled || !data) return;
        const num = Number(data.current_price ?? data.currentPrice);
        if (Number.isFinite(num)) {
          onPriceRef.current?.(num, data);
        }
      } catch {
        /* keep last known price */
      }
    };

    const schedulePoll = () => {
      if (cancelled) return;
      const ms = document.hidden ? 25000 : 15000;
      pollTimer = setTimeout(async () => {
        await refresh();
        schedulePoll();
      }, ms);
    };

    schedulePoll();
    const detachResume = attachPageResumeHandlers(refresh);
    const disposeWs = connectPriceWebSocket({
      onPriceUpdate: (update) => {
        if (String(update.product_id) !== pid) return;
        const num = Number(update.current_price);
        if (Number.isFinite(num)) onPriceRef.current?.(num);
      },
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      detachResume();
      disposeWs();
    };
  }, [productId]);
}
