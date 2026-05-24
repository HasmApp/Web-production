/**
 * Product feed filters — mirrors Mobile-production `product_service.dart`.
 */
import {
  isBundlePackageProduct,
  isFeaturedDealProduct,
  isPromotionProduct,
} from './productFlags.js';
import { productMatchesCategory } from '../constants/shopCategories.js';
import { parseProductCategory } from './formatProductCategory.js';

export function filterByWorldAndSubcategory(products, world, subcategory) {
  const list = Array.isArray(products) ? products : [];
  return list.filter((p) => {
    if (world && !productMatchesCategory(p, world)) return false;
    if (subcategory && world) {
      const parsed = parseProductCategory(p.category);
      return parsed.subcategory === subcategory;
    }
    return true;
  });
}

export const HOME_FEED_PRICE_EPSILON = 0.02;

export function productPrices(p) {
  const current = Number(p?.current_price ?? p?.currentPrice ?? 0);
  const minimum = Number(p?.minimum_price ?? p?.minimumPrice ?? 0);
  const initial = Number(p?.initial_price ?? p?.initialPrice ?? 0);
  return { current, minimum, initial };
}

/** Rounded % off from initial → minimum (Deals tab `dealPriceDisplay`). */
export function dealDiscountPercent(p) {
  const { initial, minimum } = productPrices(p);
  if (!Number.isFinite(initial) || initial <= 0 || minimum >= initial) return null;
  const pct = Math.round(((initial - minimum) / initial) * 100);
  return pct > 0 ? pct : null;
}

export function isHomeNewProduct(p) {
  const { current, minimum } = productPrices(p);
  return current > minimum + HOME_FEED_PRICE_EPSILON;
}

export function isHomeDealProduct(p) {
  const { current, minimum, initial } = productPrices(p);
  if (!(initial > minimum + HOME_FEED_PRICE_EPSILON)) return false;
  return current <= minimum + HOME_FEED_PRICE_EPSILON;
}

export function isDealsPageProduct(p) {
  return isFeaturedDealProduct(p) || isPromotionProduct(p);
}

export function excludeDealsPageProducts(products) {
  return (Array.isArray(products) ? products : []).filter((p) => !isDealsPageProduct(p));
}

export function filterHomeFeedTab(products, tab) {
  const list = Array.isArray(products) ? products : [];
  if (tab === 'deals') return list.filter(isFeaturedDealProduct);
  return list.filter(isHomeNewProduct);
}

export function sortProductsForDeals(products) {
  return [...products].sort((a, b) => {
    const saveA = productPrices(a).initial - productPrices(a).minimum;
    const saveB = productPrices(b).initial - productPrices(b).minimum;
    return saveB - saveA;
  });
}

export function excludePackageProducts(products) {
  return (Array.isArray(products) ? products : []).filter(
    (p) => !isBundlePackageProduct(p),
  );
}

export function filterByStockType(products, stockType) {
  const list = Array.isArray(products) ? products : [];
  if (!stockType) return list;
  return list.filter((p) => {
    const fullOnly = p.sell_full_quantity_only === true || p.sellFullQuantityOnly === true;
    if (stockType === 'full_stock') return fullOnly;
    if (stockType === 'by_pieces') return !fullOnly;
    return true;
  });
}

export function filterInStock(products) {
  return (Array.isArray(products) ? products : []).filter(
    (p) => Number(p.quantity ?? p.stock ?? 0) > 0,
  );
}

export function filterBySearchQuery(products, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => {
    const blobs = [p.title_en, p.titleEn, p.title, p.title_ar, p.titleAr]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    return blobs.some((b) => b.includes(q));
  });
}

export function sortProductsByPriceDecay(products) {
  return [...products].sort((a, b) => {
    const pa = productPrices(a).current;
    const pb = productPrices(b).current;
    const dropA = (productPrices(a).initial - pa) / (productPrices(a).initial || 1);
    const dropB = (productPrices(b).initial - pb) / (productPrices(b).initial || 1);
    return dropB - dropA;
  });
}

export function sortByPrice(products, order) {
  return [...products].sort((a, b) => {
    const pa = productPrices(a).current;
    const pb = productPrices(b).current;
    if (order === 'low') return pa - pb;
    if (order === 'high') return pb - pa;
    return 0;
  });
}

/** Build deals-tab catalog slice (matches `shop_deals_page.dart`). */
export function buildDealsCatalog(
  products,
  { search = '', sort = 'default', world = '', subcategory = null } = {},
) {
  let list = filterInStock(products);
  list = excludePackageProducts(list);
  list = filterByStockType(list, 'full_stock');
  if (world || subcategory) {
    list = filterByWorldAndSubcategory(list, world, subcategory);
  }

  let promotions = sortProductsForDeals(list.filter(isPromotionProduct));
  const promotionIds = new Set(
    promotions.map((p) => String(p._id ?? p.id ?? '').trim()).filter(Boolean),
  );

  let deals = filterHomeFeedTab(list, 'deals').filter(
    (p) => !promotionIds.has(String(p._id ?? p.id ?? '').trim()),
  );
  deals = sortProductsForDeals(deals);

  if (search) {
    promotions = filterBySearchQuery(promotions, search);
    deals = filterBySearchQuery(deals, search);
  } else if (sort !== 'default') {
    promotions = sortByPrice(promotions, sort);
    deals = sortByPrice(deals, sort);
  }

  return { promotions, deals };
}
