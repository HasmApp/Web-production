import { isAuctionWonCartItem, productIdKey } from './supplierCart.js';

/** Product IDs that no longer exist in the shop (deleted or hidden). */
export async function findUnavailableCartProductIds(cartLines, { catalog, fetchProductById }) {
  const lines = (Array.isArray(cartLines) ? cartLines : []).filter(
    (i) => !isAuctionWonCartItem(i),
  );
  const uniqueIds = [
    ...new Set(
      lines
        .map((i) => String(i.productId || productIdKey(i.product) || '').trim())
        .filter(Boolean),
    ),
  ];
  if (!uniqueIds.length) return new Set();

  const catalogIds = new Set(
    (Array.isArray(catalog) ? catalog : []).map((p) => productIdKey(p)).filter(Boolean),
  );
  const unavailable = new Set();

  await Promise.all(
    uniqueIds.map(async (id) => {
      if (catalogIds.has(id)) return;
      try {
        const product = await fetchProductById(id);
        if (!product) unavailable.add(id);
      } catch {
        unavailable.add(id);
      }
    }),
  );

  return unavailable;
}
