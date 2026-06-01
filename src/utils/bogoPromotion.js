import { isPromotionProduct } from './productFlags.js';
import { isAuctionWonCartItem } from './supplierCart.js';
import { hasSizeQuantities, isColorVariant, resolveSizeInProduct } from './sizeQuantities.js';

/** Units shown at checkout / sent to order API (2× for 1+1). */
export function checkoutDisplayQuantity(cartLine) {
  const q = Number(cartLine?.quantity ?? 1);
  return isPromotionProduct(cartLine?.product) ? q * 2 : q;
}

/** Billable line total (pay for cart quantity only). */
export function billableLineTotal(cartLine) {
  const q = Number(cartLine?.quantity ?? 1);
  const price = Number(cartLine?.price ?? 0);
  return price * q;
}

/** Order API line: fulfillment qty with half unit price so total = billable. */
export function toCheckoutOrderItem(cartLine) {
  const promo = isPromotionProduct(cartLine?.product);
  const cartQty = Number(cartLine?.quantity ?? 1);
  const price = Number(cartLine?.price ?? 0);
  const row = {
    product_id: cartLine.productId ?? cartLine.product?._id ?? cartLine.product?.id,
    quantity: promo ? cartQty * 2 : cartQty,
    price: promo ? price / 2 : price,
    ...(cartLine.size
      ? { size: resolveSizeInProduct(cartLine.product, cartLine.size) || cartLine.size }
      : {}),
  };
  if (isAuctionWonCartItem(cartLine)) {
    const p = cartLine.product;
    row.is_auction_won = true;
    row.auction_expires_at = p?.auction_expires_at ?? p?.auctionExpiresAt ?? null;
  }
  return row;
}

/** Block checkout when a variant product has no size/color on the cart line. */
export function validateCheckoutLinesForPayment(cartLines, t) {
  const errors = [];
  for (const line of cartLines || []) {
    const product = line?.product;
    if (!hasSizeQuantities(product)) continue;
    const name =
      (product?.title_ar || product?.titleAr || product?.title || '').trim() || 'Product';
    const variantMsg = isColorVariant(product)
      ? t('selectColorRequired')
      : t('selectSizeRequired');
    const label = String(line?.size || '').trim();
    if (!label) {
      errors.push(`${name}: ${variantMsg}`);
      continue;
    }
    if (!resolveSizeInProduct(product, label)) {
      errors.push(`${name}: ${variantMsg}`);
    }
  }
  return errors;
}

/** Validate-cart payload (full unit price, fulfillment quantity). */
export function toValidateCartItem(cartLine) {
  const promo = isPromotionProduct(cartLine?.product);
  const cartQty = Number(cartLine?.quantity ?? 1);
  const row = {
    product_id: cartLine.productId ?? cartLine.product?._id ?? cartLine.product?.id,
    quantity: promo ? cartQty * 2 : cartQty,
    price: Number(cartLine?.price ?? 0),
    ...(cartLine.size
      ? { size: resolveSizeInProduct(cartLine.product, cartLine.size) || cartLine.size }
      : {}),
  };
  if (isAuctionWonCartItem(cartLine)) {
    const p = cartLine.product;
    row.is_auction_won = true;
    row.auction_expires_at = p?.auction_expires_at ?? p?.auctionExpiresAt ?? null;
  }
  return row;
}
