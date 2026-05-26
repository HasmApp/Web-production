import { stockForSize } from './sizeQuantities.js';

/** Platform-computed cap (final_max_quantity or per-box / weight limits). */
export function shippingMaximum(product) {
  const finalMax = Number(
    product?.final_max_quantity ?? product?.finalMaxQuantity ?? 0,
  );
  if (finalMax > 0) return finalMax;
  const perBox = Number(
    product?.max_quantity_per_box ?? product?.maxQuantityPerBox ?? 0,
  );
  if (perBox > 0) return perBox;
  const byWeight = Number(
    product?.max_quantity_by_weight ?? product?.maxQuantityByWeight ?? 0,
  );
  if (byWeight > 0) return byWeight;
  return null;
}

/** Matches mobile `CartQuantityLimits.maxForProduct`. */
export function maxSelectableQuantity(product, selectedSize = null) {
  const stock = stockForSize(product, selectedSize);
  if (stock <= 0) return 0;
  const isFullStock =
    product.sell_full_quantity_only === true ||
    product.sellFullQuantityOnly === true ||
    product.from_ended_auction === true ||
    product.fromEndedAuction === true;
  if (isFullStock) return stock;
  const shippingMax = shippingMaximum(product);
  if (shippingMax == null) return stock;
  return stock < shippingMax ? stock : shippingMax;
}
