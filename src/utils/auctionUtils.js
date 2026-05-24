import { parseProductCategory } from './formatProductCategory.js';
import { normalizeProduct, fetchAuctionById } from '../services/api.js';

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

export function filterAuctionRooms(rooms, { world, subcategory } = {}) {
  const list = Array.isArray(rooms) ? rooms : [];
  if (!world) return list;
  return list.filter((room) => {
    const parsed = parseProductCategory(room.product_category ?? room.productCategory);
    if (parsed.category !== world) return false;
    if (subcategory) return parsed.subcategory === subcategory;
    return true;
  });
}

export function isActiveAuctionRoom(room) {
  const remaining = Number(room?.time_remaining ?? room?.timeRemaining ?? 0);
  const active = room?.is_active ?? room?.isActive;
  return remaining > 0 && active !== false;
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
