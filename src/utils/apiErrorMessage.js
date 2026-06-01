/**
 * Prefer the API `detail` string so checkout errors (400) show the real reason.
 */
const NOT_SHIPPABLE_RE =
  /^'([^']+)'\s+cannot be shipped due to dimensions or weight exceeding shipping limits$/i;

export function apiErrorMessage(err, lang, t, fallbackKey, tf) {
  const d = err?.response?.data?.detail;
  let detail = null;
  if (typeof d === 'string' && d.trim()) {
    detail = d.trim();
  } else if (Array.isArray(d) && d[0]?.msg) {
    detail = String(d[0].msg);
  } else if (typeof err?.message === 'string' && err.message.trim() && !err.message.startsWith('HTTP ')) {
    detail = err.message.trim();
  }
  if (detail) {
    console.error('[API]', detail);
    const ship = detail.match(NOT_SHIPPABLE_RE);
    if (ship && typeof tf === 'function') {
      return tf('productNotShippable', { name: ship[1] });
    }
    return detail;
  }
  return t(fallbackKey);
}

/** Arabic UI: hide all-Latin carrier event lines; show API text if it already includes Arabic. */
export function trackingEventLine(text, lang, t, fallbackKey = 'trackingEventGeneric') {
  const s = (text || '').trim();
  if (!s) return t(fallbackKey);
  if (lang !== 'ar') return s;
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s);
  return hasArabic ? s : t(fallbackKey);
}
