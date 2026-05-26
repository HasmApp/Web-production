import { formatOrderDate } from './formatLocaleDate.js';

export function getProductExpiryDate(product) {
  const raw = product?.expiry_date ?? product?.expiryDate;
  if (raw == null || raw === '') return null;
  return String(raw).trim() || null;
}

export function getProductProductionDate(product) {
  const raw = product?.production_date ?? product?.productionDate;
  if (raw == null || raw === '') return null;
  return String(raw).trim() || null;
}

export function formatFoodProductDate(value, lang = 'en') {
  if (!value) return '';
  return formatOrderDate(value, lang);
}
