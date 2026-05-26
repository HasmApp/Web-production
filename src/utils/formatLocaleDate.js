/** Saudi Arabia — order dates on web (UTC in DB → Asia/Riyadh for display). */
export const DISPLAY_TIME_ZONE = 'Asia/Riyadh';

export function parseApiDateTime(value) {
  if (value instanceof Date) return value;
  if (value == null || value === '') return new Date(NaN);
  const s = String(value).trim();
  if (!s) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00+03:00`);
  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(`${s.replace(/\.\d+$/, '')}Z`);
  return new Date(s);
}

export function getOrderDateParts(value, lang = 'en') {
  const d = parseApiDateTime(value);
  if (Number.isNaN(d.getTime())) return null;

  const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    calendar: 'gregory',
    timeZone: DISPLAY_TIME_ZONE,
  }).formatToParts(d);

  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: pick('day'), month: pick('month'), year: pick('year') };
}

/** Arabic: "26 مايو 2026" — English: "May 26, 2026" */
export function formatOrderDate(value, lang = 'en') {
  const p = getOrderDateParts(value, lang);
  if (!p) return '';
  if (lang === 'ar') return `${p.day} ${p.month} ${p.year}`;
  return `${p.month} ${p.day}, ${p.year}`;
}
