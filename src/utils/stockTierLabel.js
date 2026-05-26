/**
 * Cart stores English tier keys from some flows (`addItem(..., 'Full')`).
 * Display using the active UI language; pass through if already localized or unknown.
 * "Full" / كامل is omitted on cart and checkout — default sell unit, not shown to buyers.
 */
export function displayStockTierLabel(raw, t) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || s === 'full') return '';
  if (s === 'quarter') return t('quarter');
  if (s === 'half') return t('half');
  const localized = String(raw ?? '').trim();
  if (localized === t('full')) return '';
  return localized;
}

/** Strip trailing " - كامل" / " - Full" accidentally stored on product titles. */
export function cleanProductTitleForCart(title) {
  return String(title ?? '')
    .replace(/\s*[-–—]\s*كامل\s*$/iu, '')
    .replace(/\s*[-–—]\s*full\s*$/iu, '')
    .trim();
}

/** Order summary / cart line: title + optional tier + quantity. */
export function formatCartCheckoutLineLabel({
  title,
  stockLabel,
  quantity,
  t,
  tf,
  unitsKey = 'cartLineUnits',
}) {
  const name = cleanProductTitleForCart(title);
  const tier = displayStockTierLabel(stockLabel, t);
  const qtyPart = tf(unitsKey, { n: quantity });
  if (tier) return `${name} — ${tier} (${qtyPart})`;
  return `${name} (${qtyPart})`;
}
