/** Supplier id for warehouse pickup preview (auction product / room). */
export function resolvePickupSupplierId(product, room) {
  const p = product ?? room?.product;
  if (!p || typeof p !== 'object') {
    const rid = room?.owner_id ?? room?.ownerId;
    return rid ? String(rid).trim() : '';
  }
  const owner = p.owner;
  const fromOwner =
    owner && typeof owner === 'object'
      ? String(owner.id ?? owner._id ?? '').trim()
      : '';
  return String(
    p.owner_id ?? p.ownerId ?? fromOwner ?? room?.owner_id ?? room?.ownerId ?? '',
  ).trim();
}
