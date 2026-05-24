/**
 * Product flags — mirrors Mobile-production product model helpers.
 */

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const s = value.toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'yes';
  }
  return false;
}

function hasJsonKey(obj, snake, camel) {
  if (obj == null || typeof obj !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(obj, snake)
    || Object.prototype.hasOwnProperty.call(obj, camel);
}

/** Match mobile `Product.fullStockOptionList`. */
export function fullStockOptionList(p) {
  if (p == null || typeof p !== 'object') return ['full'];
  const totalQty = Number(p.quantity ?? p.stock ?? 0);
  const fromEnded = truthyFlag(p.from_ended_auction ?? p.fromEndedAuction);
  const bundleLot = truthyFlag(p.bundle_full_lot_only ?? p.bundleFullLotOnly);
  const relaxFullStockFlags = fromEnded && !bundleLot;

  const includeQuarter = () => {
    if (relaxFullStockFlags) return true;
    if (hasJsonKey(p, 'allow_quarter_quantity', 'allowQuarterQuantity')) {
      return truthyFlag(p.allow_quarter_quantity ?? p.allowQuarterQuantity);
    }
    return true;
  };
  const includeHalf = () => {
    if (relaxFullStockFlags) return true;
    if (hasJsonKey(p, 'allow_half_quantity', 'allowHalfQuantity')) {
      return truthyFlag(p.allow_half_quantity ?? p.allowHalfQuantity);
    }
    return true;
  };
  const includeFull = () => {
    if (relaxFullStockFlags) return true;
    if (hasJsonKey(p, 'allow_full_quantity', 'allowFullQuantity')) {
      return truthyFlag(p.allow_full_quantity ?? p.allowFullQuantity);
    }
    return true;
  };

  const qtyFor = (opt) => {
    if (totalQty <= 0) return 0;
    if (opt === 'quarter') {
      const raw = p.quantity_quarter ?? p.quantityQuarter;
      const n = raw != null ? Number(raw) : Math.ceil(totalQty / 4);
      return Math.min(Math.max(1, n), totalQty);
    }
    if (opt === 'half') {
      const raw = p.quantity_half ?? p.quantityHalf;
      const n = raw != null ? Number(raw) : Math.ceil(totalQty / 2);
      return Math.min(Math.max(1, n), totalQty);
    }
    const raw = p.quantity_full ?? p.quantityFull;
    const n = raw != null ? Number(raw) : totalQty;
    return Math.min(Math.max(1, n), totalQty);
  };

  const keys = [];
  if (includeQuarter()) keys.push('quarter');
  if (includeHalf()) keys.push('half');
  if (includeFull()) keys.push('full');
  const filtered = keys.filter((k) => qtyFor(k) > 0);
  return filtered.length ? filtered : ['full'];
}

export function isPickupOnlyProduct(p) {
  if (p == null || typeof p !== 'object') return false;
  return truthyFlag(p.pickup_only ?? p.pickupOnly);
}

export function isPickupOnlyAuctionRoom(room) {
  if (room == null || typeof room !== 'object') return false;
  return isPickupOnlyProduct(room) || isPickupOnlyProduct(room.product);
}

export function isPromotionProduct(p) {
  if (p == null || typeof p !== 'object') return false;
  return truthyFlag(p.has_promotion ?? p.hasPromotion);
}

export function isFeaturedDealProduct(p) {
  if (p == null || typeof p !== 'object') return false;
  return truthyFlag(p.featured_deal ?? p.featuredDeal);
}

export function isAuctionProduct(p) {
  if (p == null || typeof p !== 'object') return false;
  return truthyFlag(p.is_auction ?? p.isAuction);
}

/** Dashboard bundle / package listing — mirrors mobile `isBundlePackageProduct`. */
export function isBundlePackageProduct(p) {
  if (p == null || typeof p !== 'object') return false;
  if (truthyFlag(p.bundle_full_lot_only ?? p.bundleFullLotOnly)) return true;
  if (!truthyFlag(p.sell_full_quantity_only ?? p.sellFullQuantityOnly)) return false;
  const opts = fullStockOptionList(p);
  return opts.length === 1 && opts[0] === 'full';
}

