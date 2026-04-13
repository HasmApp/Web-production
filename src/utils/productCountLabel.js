/**
 * Word after a numeric product count.
 * English: plural unless exactly 1.
 * Arabic (MSA storefront style): 1 and 11+ use singular with the numeral; 2–10 use plural.
 */
export function productCountLabel(count, lang, t) {
  const n = Math.abs(Math.trunc(Number(count) || 0));
  if (lang === 'ar') {
    if (n === 1) return t('product');
    if (n >= 2 && n <= 10) return t('products');
    return t('product');
  }
  return n === 1 ? t('product') : t('products');
}
