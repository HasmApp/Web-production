/**
 * Cart stores English tier keys from some flows (`addItem(..., 'Full')`).
 * Display using the active UI language; pass through if already localized or unknown.
 */
export function displayStockTierLabel(raw, t) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'quarter') return t('quarter');
  if (s === 'half') return t('half');
  if (s === 'full') return t('full');
  return String(raw ?? '').trim();
}
