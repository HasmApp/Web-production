import { billableLineTotal } from './bogoPromotion.js';
import { isPickupOnlyProduct, isFeaturedDealProduct } from './productFlags.js';

export function productIdKey(p) {
  if (!p) return '';
  return String(p._id ?? p.id ?? '').trim();
}

export function supplierKeyForProduct(p) {
  const owner = p?.owner_id ?? p?.ownerId;
  if (owner != null && String(owner).trim()) return String(owner).trim();
  return productIdKey(p);
}

export function supplierDisplayName(product) {
  const company = product?.supplier_company ?? product?.supplierCompany;
  if (company && String(company).trim()) return String(company).trim();
  const name = product?.supplier_name ?? product?.supplierName;
  if (name && String(name).trim()) return String(name).trim();
  const owner = product?.owner;
  if (owner?.company_name) return String(owner.company_name).trim();
  if (owner?.name) return String(owner.name).trim();
  return product?.title_en || product?.titleEn || product?.title || '';
}

export function cartGroupKeyForItem(item) {
  const owner = item.ownerId ?? supplierKeyForProduct(item.product);
  const pickup = item.pickupOnly ? 'pickup' : 'delivery';
  return `${owner}|${pickup}`;
}

export function ownerIdFromGroupKey(groupKey) {
  const sep = groupKey.lastIndexOf('|');
  if (sep < 0) return groupKey;
  return groupKey.slice(0, sep);
}

export function groupCartItems(items) {
  if (!items?.length) return [];
  const map = new Map();
  for (const item of items) {
    const key = cartGroupKeyForItem(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  const groups = [];
  for (const [groupKey, lines] of map.entries()) {
    const first = lines[0];
    const subtotal = lines.reduce((s, i) => s + billableLineTotal(i), 0);
    groups.push({
      groupKey,
      ownerId: ownerIdFromGroupKey(groupKey),
      pickupOnly: groupKey.endsWith('|pickup'),
      displayName: supplierDisplayName(first.product),
      items: lines,
      subtotal,
    });
  }
  groups.sort((a, b) => {
    if (a.pickupOnly !== b.pickupOnly) return a.pickupOnly ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
  return groups;
}

export function suggestMoreForCartGroup(group, catalog, limit = 8) {
  if (!group?.ownerId || !Array.isArray(catalog)) return [];
  const inCart = new Set(group.items.map((i) => productIdKey(i.product)));
  return catalog
    .filter((p) => {
      if (supplierKeyForProduct(p) !== group.ownerId) return false;
      if (Number(p.quantity ?? 0) <= 0) return false;
      if (inCart.has(productIdKey(p))) return false;
      return isPickupOnlyProduct(p) === group.pickupOnly;
    })
    .slice(0, limit);
}

export function isAuctionWonCartItem(item) {
  const p = item?.product;
  if (!p) return false;
  return Boolean(
    p.is_auction_won ||
    p.auction_won ||
    p.isAuctionWon ||
    p.auction_expires_at ||
    p.auctionExpiresAt,
  );
}

/** Unit price for a catalog row (matches `cartItemFromProduct`). */
export function unitPriceFromProduct(product) {
  const dealMin = Number(product?.minimum_price ?? product?.minimumPrice ?? 0);
  const live = Number(product?.current_price ?? product?.currentPrice ?? 0);
  const featured = isFeaturedDealProduct(product);
  return featured && dealMin > 0 ? dealMin : live;
}

export function cartItemFromProduct(product, quantity, stockLabel = 'Full', size = null) {
  const price = unitPriceFromProduct(product);
  return {
    product,
    productId: productIdKey(product),
    quantity,
    stockLabel,
    size: size || null,
    price,
    ownerId: supplierKeyForProduct(product),
    pickupOnly: isPickupOnlyProduct(product),
  };
}
