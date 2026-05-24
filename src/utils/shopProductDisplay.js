/** Display helpers — mirrors Mobile-production `shop_product_display.dart`. */

function productId(p) {
  return String(p?._id ?? p?.id ?? '').trim();
}

function productCreatedAt(p) {
  const raw = p?.created_at ?? p?.createdAt ?? p?.created ?? '';
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : 0;
}

function unitsSold(p, orderCounts) {
  const id = productId(p);
  return id ? (orderCounts[id] ?? 0) : 0;
}

export function bestSellers(products, { orderCounts = {}, limit = 10 } = {}) {
  const list = Array.isArray(products) ? [...products] : [];
  list.sort((a, b) => {
    const salesCmp = unitsSold(b, orderCounts) - unitsSold(a, orderCounts);
    if (salesCmp !== 0) return salesCmp;
    return productCreatedAt(b) - productCreatedAt(a);
  });
  return list.slice(0, limit);
}

export function newArrivals(products, { limit = 10 } = {}) {
  const list = Array.isArray(products) ? [...products] : [];
  list.sort((a, b) => productCreatedAt(b) - productCreatedAt(a));
  return list.slice(0, limit);
}
