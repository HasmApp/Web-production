import toast from 'react-hot-toast';
import {
  fetchAuctionById,
  fetchOrderById,
  addAuctionWonToCart,
  normalizeProduct,
} from '../services/api.js';
import { apiErrorMessage } from './apiErrorMessage.js';

/** Add won auction to cart and navigate to checkout with home-on-back (mobile parity). */
export async function checkoutAuctionWin({
  room,
  addItem,
  navigate,
  t,
  lang,
}) {
  const roomId = room.id || room._id;
  const detail = await fetchAuctionById(roomId);
  const product = detail.product;
  if (!product) {
    toast.error(t('failedLoadAuction'));
    return;
  }
  const pid = detail.product_id || product.id || product._id;
  const qtyRaw = product.quantity ?? room.product_quantity ?? 1;
  const qty = Math.max(1, parseInt(String(qtyRaw), 10) || 1);
  const winTotal = Number(detail.current_price ?? room.current_price ?? 0);
  if (!winTotal || winTotal <= 0) {
    toast.error(t('failedLoadAuction'));
    return;
  }
  const payload = {
    product_id: String(pid),
    product_name: product.title || room.product_title || 'Auction',
    winning_bid: winTotal,
    image_url: product.image || room.product_image || '',
    auction_room_id: String(roomId),
    original_price: product.initial_price != null ? Number(product.initial_price) : undefined,
    quantity: qty,
    sell_full_quantity_only: Boolean(product.sell_full_quantity_only),
  };
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
  const unitPrice = winTotal / qty;
  const p = normalizeProduct({
    ...product,
    current_price: unitPrice,
    currentPrice: unitPrice,
  });
  addItem(
    {
      ...p,
      is_auction_won: true,
      auction_won: true,
      auction_expires_at: expiresAt,
      auction_room_id: String(roomId),
    },
    qty,
    'Full',
  );
  navigate('/checkout', { state: { exitToHomeOnBack: true } });
  toast.success(t('addedToCartToast'));
}

export async function checkoutAuctionWinSafe(opts) {
  try {
    await checkoutAuctionWin(opts);
  } catch (err) {
    toast.error(apiErrorMessage(err, opts.lang, opts.t, 'bidFailed'));
  }
}
