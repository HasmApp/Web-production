import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { billableLineTotal } from '../utils/bogoPromotion.js';
import {
  cartItemFromProduct,
  cartGroupKeyForItem,
  groupCartItems,
  productIdKey,
  unitPriceFromProduct,
  isAuctionWonCartItem,
} from '../utils/supplierCart.js';

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

  useEffect(() => { save(STORAGE_KEY, items); }, [items]);
  useEffect(() => { save(STASH_KEY, stashed); }, [stashed]);

  const addItem = useCallback((product, quantity = 1, stockLabel = 'Full', size = null) => {
    const line = cartItemFromProduct(product, quantity, stockLabel, size);
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === line.productId
          && i.stockLabel === stockLabel
          && (i.size || null) === (size || null),
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + quantity,
          price: line.price,
        };
        return next;
      }
      return [...prev, line];
    });
  }, []);

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
      const nextStash = [...load(STASH_KEY), ...toStash];
      save(STASH_KEY, nextStash);
      setStashed(nextStash);
    }
    save(STORAGE_KEY, keep);
    setItems(keep);
  }, []);

  const restoreStashedItems = useCallback(() => {
    setStashed((stash) => {
      if (stash.length) {
        setItems((prev) => [...prev, ...stash]);
      }
      return [];
    });
  }, []);

  /** Keep cart line prices in sync with live catalog (skip auction-won rows). */
  const syncLivePricesFromCatalog = useCallback((catalog) => {
    if (!Array.isArray(catalog) || catalog.length === 0) return;
    const byId = new Map(catalog.map((p) => [productIdKey(p), p]));
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (isAuctionWonCartItem(item)) return item;
        const live = byId.get(item.productId);
        if (!live) return item;
        const newPrice = unitPriceFromProduct(live);
        if (newPrice === item.price) {
          const catCur = Number(live.current_price ?? live.currentPrice ?? 0);
          const itemCur = Number(item.product?.current_price ?? item.product?.currentPrice ?? 0);
          if (catCur === itemCur) return item;
        }
        changed = true;
        return {
          ...item,
          price: newPrice,
          product: { ...item.product, ...live },
        };
      });
      return changed ? next : prev;
    });
  }, []);

  const supplierGroups = useCallback(
    (catalog = []) => groupCartItems(items),
    [items],
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
      removeItem,
      clearCart,
      isolateCheckoutForGroup,
      restoreStashedItems,
      syncLivePricesFromCatalog,
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
      removeItem,
      clearCart,
      isolateCheckoutForGroup,
      restoreStashedItems,
      syncLivePricesFromCatalog,
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
