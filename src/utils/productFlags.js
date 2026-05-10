/**
 * Warehouse pickup-only listing (matches mobile `Product.pickupOnly` / API `pickup_only`).
 */
export function isPickupOnlyProduct(p) {
  if (p == null || typeof p !== 'object') return false;
  const v = p.pickup_only ?? p.pickupOnly;
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'yes';
  }
  return false;
}

/** Auction list / win card payload: `pickup_only` on room or nested `product` (matches mobile `AuctionRoomSummary`). */
export function isPickupOnlyAuctionRoom(room) {
  if (room == null || typeof room !== 'object') return false;
  return isPickupOnlyProduct(room) || isPickupOnlyProduct(room.product);
}
