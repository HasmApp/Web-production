import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { billableLineTotal } from '../utils/bogoPromotion.js';
import {
  cartItemFromProduct,
  cartGroupKeyForItem,
  groupCartItems,
  productIdKey,
  unitPriceFromProduct,
  isAuctionWonCartItem,
  dedupeAuctionWinCartLines,
  CART_GROUP_ORDER_KEY,
  deriveGroupOrderFromItems,
  bumpGroupOrder,
  pruneGroupOrder,
} from '../utils/supplierCart.js';
import { findUnavailableCartProductIds } from '../utils/cartPrune.js';
import { buildAuctionWinCartProduct, syncAuctionWinOrder } from '../utils/auctionCheckout.js';
import { fetchProductById } from '../services/api.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'hasm_cart';
const STASH_KEY = 'hasm_cart_stash';

const load = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const save = (key, items) => localStorage.setItem(key, JSON.stringify(items));

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => load(STORAGE_KEY));
  const [stashed, setStashed] = useState(() => load(STASH_KEY));
  const [groupOrder, setGroupOrder] = useState(() => {
    const stored = load(CART_GROUP_ORDER_KEY);
    const cart = load(STORAGE_KEY);
    return Array.isArray(stored) && stored.length
      ? pruneGroupOrder(stored, cart)
      : deriveGroupOrderFromItems(cart);
  });

  const bumpGroupToFront = useCallback((groupKey) => {
    if (!groupKey) return;
    setGroupOrder((prev) => bumpGroupOrder(prev, groupKey));
  }, []);

  useEffect(() => { save(STORAGE_KEY, items); }, [items]);
  useEffect(() => { save(STASH_KEY, stashed); }, [stashed]);
  useEffect(() => {
    save(CART_GROUP_ORDER_KEY, groupOrder);
  }, [groupOrder]);
  useEffect(() => {
    setGroupOrder((prev) => pruneGroupOrder(prev, items));
  }, [items]);

  /** Drop stale auction-win rows left in stash from older checkout flows. */
  useEffect(() => {
    const stash = load(STASH_KEY);
    const cleaned = stash.filter((i) => !isAuctionWonCartItem(i));
    if (cleaned.length === stash.length) return;
    save(STASH_KEY, cleaned);
    setStashed(cleaned);
  }, []);

  const mergeLineIntoCart = useCallback((prev, line, quantity, stockLabel, size) => {
    const groupKey = cartGroupKeyForItem(line);
    const idx = prev.findIndex(
      (i) => i.productId === line.productId
        && i.stockLabel === stockLabel
        && (i.size || null) === (size || null),
    );
    const rest = idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
    const sameGroup = rest.filter((i) => cartGroupKeyForItem(i) === groupKey);
    const other = rest.filter((i) => cartGroupKeyForItem(i) !== groupKey);
    if (idx >= 0) {
      const updated = {
        ...prev[idx],
        quantity: prev[idx].quantity + quantity,
        price: line.price,
      };
      return [updated, ...sameGroup, ...other];
    }
    return [line, ...sameGroup, ...other];
  }, []);

  const addItem = useCallback((product, quantity = 1, stockLabel = 'Full', size = null) => {
    const line = cartItemFromProduct(product, quantity, stockLabel, size);
    bumpGroupToFront(cartGroupKeyForItem(line));
    setItems((prev) => mergeLineIntoCart(prev, line, quantity, stockLabel, size));
  }, [mergeLineIntoCart, bumpGroupToFront]);

  /** Auction win checkout — stash non-auction lines only; one win line in cart (sync before navigate). */
  const replaceCartForAuctionWin = useCallback((product, quantity = 1, stockLabel = 'Full', size = null) => {
    const line = {
      ...cartItemFromProduct(product, quantity, stockLabel, size),
      isAuctionWon: true,
    };
    const prev = load(STORAGE_KEY);
    const stash = load(STASH_KEY);
    const nonAuction = (list) => (Array.isArray(list) ? list : []).filter((i) => !isAuctionWonCartItem(i));
    const toStashFromPrev = nonAuction(prev);
    const cleanedStash = nonAuction(stash);
    if (toStashFromPrev.length > 0) {
      const nextStash = [...cleanedStash, ...toStashFromPrev];
      save(STASH_KEY, nextStash);
      setStashed(nextStash);
    } else if (cleanedStash.length !== stash.length) {
      save(STASH_KEY, cleanedStash);
      setStashed(cleanedStash);
    }
    save(STORAGE_KEY, [line]);
    setItems([line]);
  }, []);

  /** Leaving auction checkout — restore regular cart; drop unpurchased auction win line. */
  const restoreAfterCanceledAuctionCheckout = useCallback(() => {
    const restored = (Array.isArray(load(STASH_KEY)) ? load(STASH_KEY) : []).filter(
      (i) => !isAuctionWonCartItem(i),
    );
    save(STORAGE_KEY, restored);
    save(STASH_KEY, []);
    setItems(restored);
    setStashed([]);
  }, []);

  /** Fix duplicated auction-win lines already in localStorage before checkout renders. */
  const normalizeCartForAuctionWinCheckout = useCallback(() => {
    const prev = load(STORAGE_KEY);
    if (!prev.length) return;
    const deduped = dedupeAuctionWinCartLines(prev);
    const next = deduped.length
      ? [deduped[deduped.length - 1]]
      : [prev[prev.length - 1]];
    save(STORAGE_KEY, next);
    setItems(next);
  }, []);

  /** Rebuild won-auction line in cart (e.g. checkout opened before React state flushed). */
  const hydrateAuctionWinToCart = useCallback(async (roomId) => {
    const id = String(roomId || '').trim();
    if (!id) return false;
    try {
      const { wonProduct, qty, payload } = await buildAuctionWinCartProduct({ id, _id: id });
      let expiresAt = '';
      try {
        expiresAt = await syncAuctionWinOrder(payload);
      } catch {
        expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      }
      replaceCartForAuctionWin(
        { ...wonProduct, auction_expires_at: expiresAt, auctionExpiresAt: expiresAt },
        qty,
        'Full',
      );
      return true;
    } catch {
      return false;
    }
  }, [replaceCartForAuctionWin]);

  /** Add line then keep only its supplier group for checkout (stash the rest). */
  const purchaseForCheckout = useCallback((product, quantity = 1, stockLabel = 'Full', size = null) => {
    const line = cartItemFromProduct(product, quantity, stockLabel, size);
    const groupKey = cartGroupKeyForItem(line);
    bumpGroupToFront(groupKey);
    setItems((prev) => {
      const merged = mergeLineIntoCart(prev, line, quantity, stockLabel, size);
      const keep = merged.filter((i) => cartGroupKeyForItem(i) === groupKey);
      const toStash = merged.filter((i) => cartGroupKeyForItem(i) !== groupKey);
      if (toStash.length > 0) {
        setStashed((stash) => {
          const nextStash = [...toStash, ...stash];
          save(STASH_KEY, nextStash);
          return nextStash;
        });
      }
      save(STORAGE_KEY, keep);
      return keep;
    });
    return groupKey;
  }, [mergeLineIntoCart, bumpGroupToFront]);

  const removeItem = useCallback((productId, size = null) => {
    setItems((prev) => prev.filter(
      (i) => !(i.productId === productId && (i.size || null) === (size || null)),
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    save(STORAGE_KEY, []);
    // Keep stashed supplier lines — matches mobile clearCart (multi-vendor checkout).
  }, []);

  const isolateCheckoutForGroup = useCallback((groupKey) => {
    const prev = load(STORAGE_KEY);
    const keep = prev.filter((i) => cartGroupKeyForItem(i) === groupKey);
    const toStash = prev.filter((i) => cartGroupKeyForItem(i) !== groupKey);
    if (toStash.length > 0) {
      const nextStash = [...toStash, ...load(STASH_KEY)];
      save(STASH_KEY, nextStash);
      setStashed(nextStash);
    }
    save(STORAGE_KEY, keep);
    setItems(keep);
  }, []);

  const restoreStashedItems = useCallback(() => {
    setStashed((stash) => {
      const regular = (Array.isArray(stash) ? stash : []).filter((i) => !isAuctionWonCartItem(i));
      if (regular.length) {
        setItems((prev) => [
          ...regular,
          ...prev.filter((i) => !isAuctionWonCartItem(i)),
        ]);
      } else {
        setItems((prev) => prev.filter((i) => !isAuctionWonCartItem(i)));
      }
      save(STASH_KEY, []);
      return [];
    });
  }, []);

  /** Keep cart line prices in sync with live catalog (skip auction-won rows). */
  const syncLivePricesFromCatalog = useCallback((catalog) => {
    if (!Array.isArray(catalog) || catalog.length === 0) return;
    const byId = new Map(catalog.map((p) => [productIdKey(p), p]));
    setItems((prev) => {
      let changed = false;
      const next = prev.flatMap((item) => {
        const live = byId.get(item.productId);
        if (!live) {
          if (isAuctionWonCartItem(item)) return [item];
          changed = true;
          return [];
        }
        if (isAuctionWonCartItem(item)) return [item];
        const newPrice = unitPriceFromProduct(live);
        if (newPrice === item.price) {
          const catCur = Number(live.current_price ?? live.currentPrice ?? 0);
          const itemCur = Number(item.product?.current_price ?? item.product?.currentPrice ?? 0);
          if (catCur === itemCur) return [item];
        }
        changed = true;
        return [{
          ...item,
          price: newPrice,
          product: { ...item.product, ...live },
        }];
      });
      return changed ? next : prev;
    });
  }, []);

  /** Remove cart/stash lines whose product was deleted or is no longer in the shop. */
  const pruneDeletedProducts = useCallback(async (catalog = []) => {
    const active = load(STORAGE_KEY);
    const stash = load(STASH_KEY);
    const unavailable = await findUnavailableCartProductIds(
      [...active, ...stash],
      { catalog, fetchProductById },
    );
    if (!unavailable.size) return;

    setItems((prev) => {
      const next = prev.filter((i) => !unavailable.has(String(i.productId)));
      if (next.length === prev.length) return prev;
      save(STORAGE_KEY, next);
      return next;
    });
    setStashed((prev) => {
      const next = prev.filter((i) => !unavailable.has(String(i.productId)));
      if (next.length === prev.length) return prev;
      save(STASH_KEY, next);
      return next;
    });
  }, []);

  const supplierGroups = useCallback(
    (catalog = []) => groupCartItems(items, groupOrder),
    [items, groupOrder],
  );

  const total = items.reduce((sum, i) => sum + billableLineTotal(i), 0);
  /** Distinct cart lines (products), not sum of quantities — used for nav badges. */
  const count = items.length;
  const hasStashedItems = stashed.length > 0;

  const value = useMemo(
    () => ({
      items,
      stashed,
      hasStashedItems,
      addItem,
      replaceCartForAuctionWin,
      purchaseForCheckout,
      removeItem,
      clearCart,
      isolateCheckoutForGroup,
      restoreStashedItems,
      restoreAfterCanceledAuctionCheckout,
      normalizeCartForAuctionWinCheckout,
      hydrateAuctionWinToCart,
      syncLivePricesFromCatalog,
      pruneDeletedProducts,
      supplierGroups,
      total,
      count,
      productIdKey,
    }),
    [
      items,
      stashed,
      hasStashedItems,
      addItem,
      replaceCartForAuctionWin,
      purchaseForCheckout,
      removeItem,
      clearCart,
      isolateCheckoutForGroup,
      restoreStashedItems,
      restoreAfterCanceledAuctionCheckout,
      normalizeCartForAuctionWinCheckout,
      hydrateAuctionWinToCart,
      syncLivePricesFromCatalog,
      pruneDeletedProducts,
      supplierGroups,
      total,
      count,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
