/**
 * When UI is Arabic, avoid showing raw English `detail` from the API.
 * English UI still prefers server message when present.
 */
export function apiErrorMessage(err, lang, t, fallbackKey) {
  if (lang === 'ar') return t(fallbackKey);
  const d = err?.response?.data?.detail;
  if (typeof d === 'string' && d.trim()) return d;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg);
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
