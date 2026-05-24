import { isPromotionProduct } from './productFlags.js';

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
  return {
    product_id: cartLine.productId ?? cartLine.product?._id ?? cartLine.product?.id,
    quantity: promo ? cartQty * 2 : cartQty,
    price: promo ? price / 2 : price,
    ...(cartLine.size ? { size: cartLine.size } : {}),
  };
}

/** Validate-cart payload (full unit price, fulfillment quantity). */
export function toValidateCartItem(cartLine) {
  const promo = isPromotionProduct(cartLine?.product);
  const cartQty = Number(cartLine?.quantity ?? 1);
  return {
    product_id: cartLine.productId ?? cartLine.product?._id ?? cartLine.product?.id,
    quantity: promo ? cartQty * 2 : cartQty,
    price: Number(cartLine?.price ?? 0),
    ...(cartLine.size ? { size: cartLine.size } : {}),
  };
}
