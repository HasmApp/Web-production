import toast from 'react-hot-toast';
import {
  fetchAuctionById,
  fetchOrderById,
  addAuctionWonToCart,
  normalizeProduct,
} from '../services/api.js';
import { apiErrorMessage } from './apiErrorMessage.js';
import {
  clearPendingCheckoutGroup,
  persistAuctionWinCheckout,
  auctionWinCheckoutPath,
} from './supplierCart.js';

/** Build local cart product + order-service payload for a won auction room. */
export async function buildAuctionWinCartProduct(room) {
  const roomId = String(room?.id || room?._id || '').trim();
  if (!roomId) throw new Error('missing_room_id');

  const detail = await fetchAuctionById(roomId);
  const product = detail?.product;
  if (!product) throw new Error('missing_product');

  const pid = detail.product_id || product.id || product._id;
  const qtyRaw = product.quantity ?? room.product_quantity ?? room.productQuantity ?? 1;
  const qty = Math.max(1, parseInt(String(qtyRaw), 10) || 1);
  const winTotal = Number(detail.current_price ?? room.current_price ?? room.currentPrice ?? 0);
  if (!winTotal || winTotal <= 0) throw new Error('invalid_win_price');

  const payload = {
    product_id: String(pid),
    product_name: product.title || room.product_title || room.productTitle || 'Auction',
    winning_bid: winTotal,
    image_url: product.image || room.product_image || room.productImage || '',
    auction_room_id: roomId,
    original_price: product.initial_price != null ? Number(product.initial_price) : undefined,
    quantity: qty,
    sell_full_quantity_only: Boolean(product.sell_full_quantity_only ?? product.sellFullQuantityOnly),
  };

  const unitPrice = winTotal / qty;
  const p = normalizeProduct({
    ...product,
    current_price: unitPrice,
    currentPrice: unitPrice,
  });
  const wonProduct = {
    ...p,
    is_auction_won: true,
    auction_won: true,
    auction_room_id: roomId,
    auctionRoomId: roomId,
  };

  return { wonProduct, qty, payload, roomId };
}

/** Register win with order-service (optional if local cart already has the line). */
export async function syncAuctionWinOrder(payload) {
  const res = await addAuctionWonToCart(payload);
  const orderId = res.order_id || res.orderId;
  let expiresAt = '';
  if (orderId) {
    try {
      const order = await fetchOrderById(orderId);
      expiresAt = order?.expires_at || order?.expiresAt || '';
    } catch {
      /* optional */
    }
  }
  if (!expiresAt) {
    expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  }
  return expiresAt;
}

/** Add won auction to cart and navigate to checkout with home-on-back (mobile parity). */
export async function checkoutAuctionWin({
  room,
  addItem,
  replaceCartForAuctionWin,
  navigate,
  t,
  lang,
}) {
  const { wonProduct, qty, payload, roomId } = await buildAuctionWinCartProduct(room);

  // Local cart first — user must see the line even if order-service sync fails.
  if (typeof replaceCartForAuctionWin === 'function') {
    replaceCartForAuctionWin(wonProduct, qty, 'Full');
  } else if (typeof addItem === 'function') {
    addItem(wonProduct, qty, 'Full');
  }

  let expiresAt = '';
  try {
    expiresAt = await syncAuctionWinOrder(payload);
  } catch (err) {
    toast.error(apiErrorMessage(err, lang, t, 'bidFailed'));
    expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  }

  if (typeof replaceCartForAuctionWin === 'function') {
    replaceCartForAuctionWin(
      { ...wonProduct, auction_expires_at: expiresAt, auctionExpiresAt: expiresAt },
      qty,
      'Full',
    );
  }

  clearPendingCheckoutGroup();
  persistAuctionWinCheckout(roomId);
  navigate(auctionWinCheckoutPath(roomId), {
    state: {
      exitToHomeOnBack: true,
      auctionWinCheckout: true,
      auctionRoomId: roomId,
      startAtPayment: true,
    },
  });
  toast.success(t('addedToCartToast'));
}

export async function checkoutAuctionWinSafe(opts) {
  try {
    await checkoutAuctionWin(opts);
  } catch (err) {
    toast.error(apiErrorMessage(err, opts.lang, opts.t, 'bidFailed'));
  }
}
