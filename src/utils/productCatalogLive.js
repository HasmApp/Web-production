import config from '../config/config.js';
import { productIdKey } from './supplierCart.js';

/** Apply a WS / poll price tick to a product list (same shape as HomePage). */
export function applyProductPriceUpdate(products, update) {
  if (update?.product_id == null || update?.current_price === undefined) return products;
  const pid = String(update.product_id);
  const num = Number(update.current_price);
  if (!Number.isFinite(num)) return products;
  const list = Array.isArray(products) ? products : [];
  return list.map((p) => {
    const id = productIdKey(p);
    if (id !== pid) return p;
    return { ...p, current_price: num, currentPrice: num };
  });
}

export function parsePriceWsMessage(raw) {
  try {
    const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (msg?.type === 'ping' || msg?.type === 'pong' || msg?.type === 'connected') return null;
    const update = msg?.type === 'price_update' ? msg.data : msg;
    if (update?.product_id == null || update.current_price === undefined) return null;
    return update;
  } catch {
    return null;
  }
}

/** Refresh catalog when tab wakes or network returns (matches mobile AppLifecycle). */
export function attachPageResumeHandlers(onResume) {
  const handler = () => {
    if (document.visibilityState === 'visible') onResume();
  };
  document.addEventListener('visibilitychange', handler);
  window.addEventListener('focus', onResume);
  window.addEventListener('pageshow', onResume);
  window.addEventListener('online', onResume);
  return () => {
    document.removeEventListener('visibilitychange', handler);
    window.removeEventListener('focus', onResume);
    window.removeEventListener('pageshow', onResume);
    window.removeEventListener('online', onResume);
  };
}

/**
 * `/ws/prices` with reconnect + ping keepalive (aligned with mobile WebSocketService).
 * @returns {() => void} dispose
 */
export function connectPriceWebSocket({ onPriceUpdate, onHealthChange } = {}) {
  let ws = null;
  let dead = false;
  let reconnectTimer = null;
  let pingTimer = null;
  let reconnectAttempts = 0;

  const clearPing = () => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  };

  const scheduleReconnect = () => {
    if (dead) return;
    onHealthChange?.(false);
    if (reconnectTimer) return;
    const delay = Math.min(10000, 1000 * (2 ** reconnectAttempts));
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (dead) return;
    clearPing();
    try {
      ws?.close();
    } catch {
      /* ignore */
    }

    const token = localStorage.getItem('accessToken');
    const url = token
      ? `${config.wsBaseUrl}/ws/prices?token=${encodeURIComponent(token)}`
      : `${config.wsBaseUrl}/ws/prices`;

    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      onHealthChange?.(true);
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping' }));
          } catch {
            /* ignore */
          }
        }
      }, 30000);
    };

    ws.onmessage = (e) => {
      const update = parsePriceWsMessage(e.data);
      if (update) onPriceUpdate?.(update);
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      clearPing();
      ws = null;
      scheduleReconnect();
    };
  };

  const initialTimer = setTimeout(connect, 300);

  return () => {
    dead = true;
    clearTimeout(initialTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    clearPing();
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    ws = null;
  };
}
