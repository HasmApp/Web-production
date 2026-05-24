import {
  LayoutGrid, Shirt, Home as HomeIcon, Leaf, UtensilsCrossed,
} from 'lucide-react';

/** IDs match dashboard / product-service (Fashion, HomeLiving, …). */
export const SHOP_CATEGORIES = [
  { id: '', labelKey: 'all', icon: LayoutGrid },
  { id: 'Fashion', labelKey: 'catFashion', icon: Shirt },
  { id: 'HomeLiving', labelKey: 'catHomeLiving', icon: HomeIcon },
  { id: 'Kitchen', labelKey: 'catKitchen', icon: UtensilsCrossed },
  { id: 'LifeStyle', labelKey: 'catLifestyle', icon: Leaf },
];

/** Same keys as Mobile-production `shop_subcategories.dart`. */
export const SHOP_SUBCATEGORIES = {
  Fashion: [
    "Men's Clothing",
    "Women's Clothing",
    "Kids' Clothing",
    'Accessories',
    'Bags',
    'Shoes',
    'Other',
  ],
  HomeLiving: ['Bedding', 'Home Essentials', 'Home Decor', 'Other'],
  Kitchen: ['Coffee Tools', 'Kitchen Tools', 'Other'],
  LifeStyle: ['Tech Accessories', 'Office Supplies', "Kids' Toys", 'Other'],
};

/** Main categories hidden from shopper UI (dashboard-only). */
export const HIDDEN_FROM_SHOP_MAIN_CATEGORIES = new Set(['Food']);

export function parseProductMainAndSub(product) {
  const raw = (product?.category ?? '').toString().trim();
  if (!raw) return { main: '', sub: '' };
  const [main, ...rest] = raw.split('|');
  return { main: (main || '').trim(), sub: (rest.join('|') || '').trim() };
}

/** Food main category + legacy Kitchen|Foods listings stay off web/mobile. */
export function isHiddenFromShop(product) {
  const { main, sub } = parseProductMainAndSub(product);
  if (!main) return false;
  if (HIDDEN_FROM_SHOP_MAIN_CATEGORIES.has(main)) return true;
  if (main === 'Kitchen' && sub.toLowerCase() === 'foods') return true;
  return false;
}

export function excludeHiddenShopProducts(products) {
  return (Array.isArray(products) ? products : []).filter((p) => !isHiddenFromShop(p));
}

export function productMatchesCategory(product, categoryId) {
  if (!categoryId) return true;
  const raw = (product?.category ?? '').toString().trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  const want = categoryId.toLowerCase();
  if (lower === want || lower.startsWith(`${want}|`)) return true;
  const main = lower.split('|')[0] || lower;
  if (want === 'homeliving' && main === 'home') return true;
  return false;
}
