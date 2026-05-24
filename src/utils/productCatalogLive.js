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
    const update = msg?.type === 'price_update' ? msg.data : msg;
    if (update?.product_id == null || update.current_price === undefined) return null;
    return update;
  } catch {
    return null;
  }
}
