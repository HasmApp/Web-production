/** Per-size stock helpers (API: size_quantities JSON object). */

export function getSizeQuantities(product) {
  const raw = product?.size_quantities ?? product?.sizeQuantities;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const label = String(key || '').trim();
    const qty = Number(value);
    if (label && Number.isFinite(qty) && qty >= 0) out[label] = qty;
  }
  return Object.keys(out).length ? out : null;
}

export function getVariantOptionType(product) {
  const raw = product?.variant_option_type ?? product?.variantOptionType;
  return String(raw || '').trim().toLowerCase() === 'color' ? 'color' : 'size';
}

export function isColorVariant(product) {
  return hasSizeQuantities(product) && getVariantOptionType(product) === 'color';
}

export function hasSizeQuantities(product) {
  return getSizeQuantities(product) != null;
}

export function sizeOptions(product) {
  const map = getSizeQuantities(product);
  return map ? Object.keys(map) : [];
}

export function stockForSize(product, size) {
  const map = getSizeQuantities(product);
  if (map) {
    const label = String(size || '').trim();
    return Number(map[label] ?? 0);
  }
  return Number(product?.quantity ?? product?.stock ?? 0);
}

export function defaultSizeOption(product) {
  const options = sizeOptions(product);
  if (!options.length) return null;
  return options.find((s) => stockForSize(product, s) > 0) ?? options[0];
}

export function sumSizeQuantities(rows) {
  return (rows || []).reduce((sum, row) => {
    const qty = Number(row?.quantity);
    return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
  }, 0);
}

export function rowsToSizeQuantities(rows) {
  const out = {};
  for (const row of rows || []) {
    const label = String(row?.label || '').trim();
    const qty = Number(row?.quantity);
    if (!label || !Number.isFinite(qty) || qty < 0) continue;
    out[label] = qty;
  }
  return Object.keys(out).length ? out : null;
}

export function sizeQuantitiesToRows(map) {
  if (!map || typeof map !== 'object') return [{ label: '', quantity: '' }];
  const entries = Object.entries(map);
  if (!entries.length) return [{ label: '', quantity: '' }];
  return entries.map(([label, quantity]) => ({ label, quantity: String(quantity) }));
}
