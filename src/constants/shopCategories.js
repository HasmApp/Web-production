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

/** Shop UI currently shows All only; world categories stay in SHOP_CATEGORIES. */
export const VISIBLE_SHOP_CATEGORIES = SHOP_CATEGORIES.filter((category) => !category.id);

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
  Kitchen: ['Coffee Tools', 'Kitchen Tools', 'Foods', 'Other'],
  LifeStyle: ['Tech Accessories', 'Office Supplies', "Kids' Toys", 'Other'],
};

export function parseProductMainAndSub(product) {
  const raw = (product?.category ?? '').toString().trim();
  if (!raw) return { main: '', sub: '' };
  const [main, ...rest] = raw.split('|');
  return { main: (main || '').trim(), sub: (rest.join('|') || '').trim() };
}

/** Shopper-facing world + sub (dashboard `Food` → Kitchen / Foods). */
export function resolveShopCategory(raw) {
  const { main, sub } = parseProductMainAndSub({ category: raw });
  if (main === 'Food') {
    return { main: 'Kitchen', sub: sub || 'Foods' };
  }
  if (main === 'Kitchen' && sub.toLowerCase() === 'foods') {
    return { main: 'Kitchen', sub: 'Foods' };
  }
  return { main, sub };
}

function isFoodListing(product) {
  const raw = (product?.category ?? '').toString().trim().toLowerCase();
  const { main, sub } = resolveShopCategory(product?.category);
  if (raw.startsWith('food')) return true;
  if (main === 'Food') return true;
  if (main === 'Kitchen' && (!sub || sub.toLowerCase() === 'foods')) return true;
  return false;
}

/** Current commercial scope is food only. Other categories stay in the system. */
export function isHiddenFromShop(product) {
  return !isFoodListing(product);
}

export function excludeHiddenShopProducts(products) {
  return (Array.isArray(products) ? products : []).filter((product) => !isHiddenFromShop(product));
}

export function productMatchesCategory(product, categoryId) {
  if (!categoryId) return true;
  const { main } = resolveShopCategory(product?.category);
  if (!main) return false;
  const mainLower = main.toLowerCase();
  const want = categoryId.toLowerCase();
  if (mainLower === want) return true;
  if (want === 'homeliving' && mainLower === 'home') return true;
  return false;
}

export function productMatchesSubcategory(product, subcategory) {
  if (!subcategory) return true;
  const { sub } = resolveShopCategory(product?.category);
  return sub.toLowerCase() === subcategory.toLowerCase();
}
