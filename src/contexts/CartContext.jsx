import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'hasm_cart';

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
};

const save = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => { save(items); }, [items]);

  // Only one product allowed in cart at a time — always replaces.
  // stockLabel: 'Quarter' | 'Half' | 'Full' (shown in cart)
  const addItem = (product, quantity, stockLabel = 'Full') => {
    const item = {
      product,
      quantity,
      stockLabel,
      price: product.current_price ?? product.currentPrice ?? 0,
    };
    setItems([item]);
  };

  const removeItem = () => setItems([]);

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  // count = number of distinct products (0 or 1)
  const count = items.length;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
