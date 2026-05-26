import { normalizeProduct, fetchAuctionById } from '../services/api.js';
import { isAuctionWonCartItem, readAuctionWinCheckoutRoomId } from './supplierCart.js';

function firstNonEmpty(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of keys) {
    if (!(key in obj)) continue;
    const v = obj[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

const ROOM_TITLE_AR = [
  'product_title_ar', 'productTitleAr', 'title_ar', 'titleAr',
  'name_ar', 'nameAr', 'product_name_ar', 'productNameAr',
];
const ROOM_TITLE_EN = [
  'product_title_en', 'productTitleEn', 'title_en', 'titleEn',
  'name_en', 'nameEn', 'product_name_en', 'productNameEn',
];
const PRODUCT_TITLE_AR = [
  'title_ar', 'titleAr', 'name_ar', 'nameAr', 'product_title_ar', 'productTitleAr',
];
const PRODUCT_TITLE_EN = [
  'title_en', 'titleEn', 'name_en', 'nameEn', 'product_title_en', 'productTitleEn',
];
const FALLBACK_TITLE = ['product_title', 'productTitle', 'title', 'name'];

export function auctionRoomListTitle(room, lang, fallback) {
  const product = room?.product && typeof room.product === 'object' ? room.product : null;
  if (lang === 'ar') {
    let t = firstNonEmpty(room, ROOM_TITLE_AR);
    if (!t && product) t = firstNonEmpty(product, PRODUCT_TITLE_AR);
    if (t) return t;
    let fb = firstNonEmpty(room, FALLBACK_TITLE);
    if (!fb && product) fb = firstNonEmpty(product, ['title', 'name', 'product_title', 'productTitle']);
    return fb || fallback;
  }
  let t = firstNonEmpty(room, ROOM_TITLE_EN);
  if (!t && product) t = firstNonEmpty(product, PRODUCT_TITLE_EN);
  if (t) return t;
  let fb = firstNonEmpty(room, FALLBACK_TITLE);
  if (!fb && product) fb = firstNonEmpty(product, ['title_en', 'titleEn', 'title', 'name']);
  return fb || fallback;
}

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const s = value.toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'yes';
  }
  return false;
}

function roomProduct(room) {
  return room?.product && typeof room.product === 'object' ? room.product : null;
}

function roomSellFullFlag(room) {
  const product = roomProduct(room);
  return (
    truthyFlag(room?.sell_full_quantity_only ?? room?.sellFullQuantityOnly)
    || (product && truthyFlag(product.sell_full_quantity_only ?? product.sellFullQuantityOnly))
  );
}

function roomAllowTierValue(room, snake, camel) {
  const product = roomProduct(room);
  if (room != null && typeof room === 'object') {
    if (snake in room || camel in room) {
      return room[snake] ?? room[camel];
    }
  }
  if (product != null) {
    if (snake in product || camel in product) {
      return product[snake] ?? product[camel];
    }
  }
  return undefined;
}

/** Quarter/half tiers enabled (dashboard single-listing default). */
function roomAllowQuarterHalf(room) {
  const quarterRaw = roomAllowTierValue(room, 'allow_quarter_quantity', 'allowQuarterQuantity');
  const halfRaw = roomAllowTierValue(room, 'allow_half_quantity', 'allowHalfQuantity');
  if (quarterRaw !== undefined || halfRaw !== undefined) {
    return truthyFlag(quarterRaw) || truthyFlag(halfRaw);
  }
  // Missing tier data on list + detail: treat sell-full single listings as retail (B2C).
  return roomSellFullFlag(room);
}

/** B2B bundle / full-lot stock (wholesalers only). */
export function isB2bAuctionRoom(room) {
  if (room == null || typeof room !== 'object') return false;
  if (truthyFlag(room.bundle_full_lot_only ?? room.bundleFullLotOnly)) return true;
  const product = roomProduct(room);
  if (product && truthyFlag(product.bundle_full_lot_only ?? product.bundleFullLotOnly)) {
    return true;
  }
  if (!roomSellFullFlag(room)) return false;
  return !roomAllowQuarterHalf(room);
}

/** B2C retail — same rule as mobile auction rail. */
export function isB2cRetailAuctionRoom(room) {
  if (room == null || typeof room !== 'object') return false;
  if (truthyFlag(room.bundle_full_lot_only ?? room.bundleFullLotOnly)) return false;
  const product = roomProduct(room);
  if (product && truthyFlag(product.bundle_full_lot_only ?? product.bundleFullLotOnly)) {
    return false;
  }
  if (!roomSellFullFlag(room)) return true;
  return roomAllowQuarterHalf(room);
}

/** @deprecated — use isB2bAuctionRoom */
export function isPackageAuctionRoom(room) {
  return isB2bAuctionRoom(room);
}

export function excludePackageAuctionRooms(rooms) {
  return (Array.isArray(rooms) ? rooms : []).filter((room) => isB2cRetailAuctionRoom(room));
}

/** Consumer live-auction rail: retail auctions only (not B2B stock/bundle lots). */
export function filterAuctionRooms(rooms) {
  return excludePackageAuctionRooms(rooms);
}

/** User wins — show retail/B2C wins only (not wholesale bundle lots). */
export function filterWonAuctionRooms(rooms) {
  return (Array.isArray(rooms) ? rooms : []).filter(isB2cRetailAuctionRoom);
}

/** Seconds left — prefers server end_time (stable after client sleep). */
export function auctionRemainingSeconds(room) {
  const end = room?.end_time ?? room?.endTime;
  if (end) {
    const endMs = new Date(end).getTime();
    if (Number.isFinite(endMs)) {
      return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
    }
  }
  return Math.max(0, Number(room?.time_remaining ?? room?.timeRemaining ?? 0));
}

export function isActiveAuctionRoom(room) {
  const remaining = auctionRemainingSeconds(room);
  const active = room?.is_active ?? room?.isActive;
  return remaining > 0 && active !== false;
}

export function activeAuctionProductIds(rooms) {
  const ids = new Set();
  for (const room of Array.isArray(rooms) ? rooms : []) {
    if (!isActiveAuctionRoom(room)) continue;
    const pid = String(room.product_id ?? room.productId ?? '').trim();
    if (pid) ids.add(pid);
  }
  return ids;
}

function isActivePendingAuctionOrder(order) {
  const exp = order?.expires_at ?? order?.expiresAt;
  if (!exp) return true;
  const t = new Date(exp).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export function fulfillablePendingAuctionOrders(orders) {
  return (Array.isArray(orders) ? orders : []).filter(isActivePendingAuctionOrder);
}

export function pruneStaleAuctionWonCartItems(cartItems, myWins, pendingOrders, removeItem) {
  if (typeof removeItem !== 'function') return;
  if (readAuctionWinCheckoutRoomId()) return;

  const allowedProductIds = new Set();
  const allowedRoomIds = new Set();
  for (const w of Array.isArray(myWins) ? myWins : []) {
    const pid = String(w.product_id ?? w.productId ?? '').trim();
    if (pid) allowedProductIds.add(pid);
    const rid = String(w.id ?? w._id ?? '').trim();
    if (rid) allowedRoomIds.add(rid);
  }
  for (const o of fulfillablePendingAuctionOrders(pendingOrders)) {
    for (const it of o.items || []) {
      const pid = String(it.product_id ?? it.productId ?? '').trim();
      if (pid) allowedProductIds.add(pid);
    }
  }
  for (const item of Array.isArray(cartItems) ? cartItems : []) {
    if (!isAuctionWonCartItem(item)) continue;
    const p = item.product;
    const roomId = String(p?.auction_room_id ?? p?.auctionRoomId ?? '').trim();
    if (roomId && allowedRoomIds.has(roomId)) continue;
    if (!allowedProductIds.has(String(item.productId || '').trim())) {
      removeItem(item.productId, item.size ?? null);
    }
  }
}

const detailCache = new Map();

export async function enrichAuctionRoomsFromDetail(rooms, lang) {
  if (!Array.isArray(rooms) || rooms.length === 0) return rooms;
  return Promise.all(
    rooms.map(async (room) => {
      const id = String(room.id || room._id);
      let prod = detailCache.get(id);
      if (!prod) {
        const detail = await fetchAuctionById(id).catch(() => null);
        prod = detail?.product ? normalizeProduct(detail.product) : null;
        if (prod) detailCache.set(id, prod);
      }
      if (!prod) return room;
      return {
        ...room,
        product: room.product ?? prod,
        bundle_full_lot_only:
          room.bundle_full_lot_only ?? room.bundleFullLotOnly
          ?? prod.bundle_full_lot_only ?? prod.bundleFullLotOnly,
        bundleFullLotOnly:
          room.bundle_full_lot_only ?? room.bundleFullLotOnly
          ?? prod.bundle_full_lot_only ?? prod.bundleFullLotOnly,
        sell_full_quantity_only:
          room.sell_full_quantity_only ?? room.sellFullQuantityOnly
          ?? prod.sell_full_quantity_only ?? prod.sellFullQuantityOnly,
        sellFullQuantityOnly:
          room.sell_full_quantity_only ?? room.sellFullQuantityOnly
          ?? prod.sell_full_quantity_only ?? prod.sellFullQuantityOnly,
        allow_quarter_quantity:
          room.allow_quarter_quantity ?? room.allowQuarterQuantity
          ?? prod.allow_quarter_quantity ?? prod.allowQuarterQuantity,
        allowQuarterQuantity:
          room.allow_quarter_quantity ?? room.allowQuarterQuantity
          ?? prod.allow_quarter_quantity ?? prod.allowQuarterQuantity,
        allow_half_quantity:
          room.allow_half_quantity ?? room.allowHalfQuantity
          ?? prod.allow_half_quantity ?? prod.allowHalfQuantity,
        allowHalfQuantity:
          room.allow_half_quantity ?? room.allowHalfQuantity
          ?? prod.allow_half_quantity ?? prod.allowHalfQuantity,
      };
    }),
  );
}

export function formatAuctionTimeRemaining(seconds, t) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s <= 0) return t('auctionEnded') || '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Block bidding while an auction win is still awaiting checkout (mirrors mobile). */
export function hasUnpaidAuctionWin({
  cartItems = [],
  myWins = [],
  pendingAuctionOrders = [],
  currentRoomId = null,
} = {}) {
  const pending = fulfillablePendingAuctionOrders(pendingAuctionOrders);
  const wins = Array.isArray(myWins) ? myWins : [];
  const allowedProductIds = new Set();
  for (const w of wins) {
    const pid = String(w.product_id ?? w.productId ?? '').trim();
    if (pid) allowedProductIds.add(pid);
  }
  for (const o of pending) {
    for (const it of o.items || []) {
      const pid = String(it.product_id ?? it.productId ?? '').trim();
      if (pid) allowedProductIds.add(pid);
    }
  }

  for (const item of cartItems) {
    if (!isAuctionWonCartItem(item)) continue;
    if (allowedProductIds.has(item.productId)) return true;
  }
  if (pending.length > 0) return true;

  const cur = currentRoomId != null ? String(currentRoomId) : null;
  return wins.some((w) => {
    const id = String(w.id || w._id || '').trim();
    if (!id) return false;
    if (cur && id === cur) return false;
    return true;
  });
}
