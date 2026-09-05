import { billableLineTotal } from './bogoPromotion.js';
import { isPickupOnlyProduct, isFeaturedDealProduct } from './productFlags.js';

const CART_STORAGE_KEY = 'hasm_cart';

/** sessionStorage: won-auction checkout in progress (survives lost React Router location.state). */
const AUCTION_WIN_CHECKOUT_KEY = 'hasm_auction_win_checkout';

export function persistAuctionWinCheckout(roomId) {
  const id = String(roomId || '').trim();
  if (!id) return;
  try {
    sessionStorage.setItem(AUCTION_WIN_CHECKOUT_KEY, id);
  } catch {
    /* private mode */
  }
}

export function readAuctionWinCheckoutRoomId() {
  try {
    return String(sessionStorage.getItem(AUCTION_WIN_CHECKOUT_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function clearAuctionWinCheckout() {
  try {
    sessionStorage.removeItem(AUCTION_WIN_CHECKOUT_KEY);
  } catch {
    /* private mode */
  }
}

export function auctionWinCheckoutPath(roomId) {
  const id = String(roomId || '').trim();
  return id ? `/checkout?auctionWin=${encodeURIComponent(id)}` : '/checkout';
}

export function parseAuctionWinFromSearch(search) {
  try {
    const raw = new URLSearchParams(search || '').get('auctionWin');
    return raw ? String(raw).trim() : '';
  } catch {
    return '';
  }
}

/** Read cart lines from localStorage (used when checkout mounts before React state flushes). */
export function readStoredCartItems() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** sessionStorage: supplier group user chose to checkout before login redirect */
export const PENDING_CHECKOUT_GROUP_KEY = 'hasm_pending_checkout_group';

export function savePendingCheckoutGroup(groupKey) {
  if (!groupKey) return;
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_GROUP_KEY, groupKey);
  } catch {
    /* private mode */
  }
}

export function readPendingCheckoutGroup() {
  try {
    return sessionStorage.getItem(PENDING_CHECKOUT_GROUP_KEY);
  } catch {
    return null;
  }
}

export function clearPendingCheckoutGroup() {
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_GROUP_KEY);
  } catch {
    /* private mode */
  }
}

export function productIdKey(p) {
  if (!p) return '';
  return String(p._id ?? p.id ?? '').trim();
}

export function supplierKeyForProduct(p) {
  const owner = p?.owner_id ?? p?.ownerId;
  if (owner != null && String(owner).trim()) return String(owner).trim();
  return productIdKey(p);
}

export function supplierDisplayName(product) {
  const company = product?.supplier_company ?? product?.supplierCompany;
  if (company && String(company).trim()) return String(company).trim();
  const name = product?.supplier_name ?? product?.supplierName;
  if (name && String(name).trim()) return String(name).trim();
  const owner = product?.owner;
  if (owner?.company_name) return String(owner.company_name).trim();
  if (owner?.name) return String(owner.name).trim();
  return product?.title_en || product?.titleEn || product?.title || '';
}

/** Stable supplier+fulfillment key — always from product row, not stale line.ownerId. */
export function cartGroupKeyForItem(item) {
  const owner = supplierKeyForProduct(item.product);
  const pickup = (item.pickupOnly ?? isPickupOnlyProduct(item.product))
    ? 'pickup'
    : 'delivery';
  return `${owner}|${pickup}`;
}

export const CART_GROUP_ORDER_KEY = 'hasm_cart_group_order';

export function deriveGroupOrderFromItems(items) {
  const order = [];
  for (const item of items || []) {
    const key = cartGroupKeyForItem(item);
    if (!order.includes(key)) order.push(key);
  }
  return order;
}

export function bumpGroupOrder(order, groupKey) {
  const key = String(groupKey || '').trim();
  if (!key) return Array.isArray(order) ? [...order] : [];
  const prev = Array.isArray(order) ? order : [];
  return [key, ...prev.filter((k) => k !== key)];
}

export function pruneGroupOrder(order, items) {
  const active = deriveGroupOrderFromItems(items);
  const activeSet = new Set(active);
  const pruned = (Array.isArray(order) ? order : []).filter((k) => activeSet.has(k));
  for (const key of active) {
    if (!pruned.includes(key)) pruned.push(key);
  }
  return pruned;
}

export function ownerIdFromGroupKey(groupKey) {
  const sep = groupKey.lastIndexOf('|');
  if (sep < 0) return groupKey;
  return groupKey.slice(0, sep);
}

export function groupCartItems(items, preferredGroupOrder = []) {
  if (!items?.length) return [];
  const map = new Map();
  const keysInCart = deriveGroupOrderFromItems(items);
  for (const item of items) {
    const key = cartGroupKeyForItem(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  const mergedOrder = [
    ...(Array.isArray(preferredGroupOrder) ? preferredGroupOrder : []).filter((k) => map.has(k)),
    ...keysInCart.filter((k) => !(preferredGroupOrder || []).includes(k)),
  ];
  return mergedOrder.map((groupKey) => {
    const lines = map.get(groupKey);
    const first = lines[0];
    const subtotal = lines.reduce((s, i) => s + billableLineTotal(i), 0);
    return {
      groupKey,
      ownerId: ownerIdFromGroupKey(groupKey),
      pickupOnly: groupKey.endsWith('|pickup'),
      displayName: supplierDisplayName(first.product),
      items: lines,
      subtotal,
    };
  });
}

export function suggestMoreForCartGroup(group, catalog, limit = 8) {
  if (!group?.ownerId || !Array.isArray(catalog)) return [];
  const inCart = new Set(group.items.map((i) => productIdKey(i.product)));
  return catalog
    .filter((p) => {
      if (supplierKeyForProduct(p) !== group.ownerId) return false;
      if (Number(p.quantity ?? 0) <= 0) return false;
      if (inCart.has(productIdKey(p))) return false;
      return isPickupOnlyProduct(p) === group.pickupOnly;
    })
    .slice(0, limit);
}

export function isAuctionWonCartItem(item) {
  const p = item?.product;
  if (item?.isAuctionWon || item?.is_auction_won) return true;
  if (!p) return false;
  return Boolean(
    p.is_auction_won ||
    p.auction_won ||
    p.isAuctionWon ||
    p.auction_expires_at ||
    p.auctionExpiresAt ||
    p.auction_room_id ||
    p.auctionRoomId,
  );
}

/** One checkout line per auction room (latest wins if duplicates slipped in). */
export function dedupeAuctionWinCartLines(lines) {
  const list = Array.isArray(lines) ? lines : [];
  const byKey = new Map();
  for (const line of list) {
    if (!isAuctionWonCartItem(line)) continue;
    const p = line.product;
    const key = String(
      p?.auction_room_id ?? p?.auctionRoomId ?? line.productId ?? '',
    ).trim() || productIdKey(p);
    byKey.set(key, line);
  }
  return [...byKey.values()];
}

/** Unit price for a catalog row (matches `cartItemFromProduct`). */
export function unitPriceFromProduct(product) {
  const dealMin = Number(product?.minimum_price ?? product?.minimumPrice ?? 0);
  const live = Number(product?.current_price ?? product?.currentPrice ?? 0);
  const featured = isFeaturedDealProduct(product);
  return featured && dealMin > 0 ? dealMin : live;
}

export function cartItemFromProduct(product, quantity, stockLabel = 'Full', size = null) {
  const price = unitPriceFromProduct(product);
  return {
    product,
    productId: productIdKey(product),
    quantity,
    stockLabel,
    size: size || null,
    price,
    ownerId: supplierKeyForProduct(product),
    pickupOnly: isPickupOnlyProduct(product),
    offerLocked: Boolean(product?._offerLocked),
  };
}
