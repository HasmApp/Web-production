import { stockForSize } from './sizeQuantities.js';
import { isAuctionWonCartItem } from './supplierCart.js';

const firstValue = (product, keys) => {
  for (const key of keys) {
    const value = product?.[key];
    if (value != null && String(value).trim()) return value;
  }
  return null;
};

export const productMoq = (product) => {
  const value = Number(firstValue(product, [
    'moq', 'minimum_order_quantity', 'minimumOrderQuantity', 'min_order_quantity',
  ]));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
};

export const productUnit = (product) =>
  firstValue(product, ['unit', 'unit_name', 'unitName', 'unit_of_measure', 'uom']);

export const productCondition = (product) =>
  firstValue(product, ['condition', 'product_condition', 'item_condition']);

export const productLifecycle = (product) =>
  firstValue(product, ['lifecycle', 'lifecycle_status', 'lifecycleStatus', 'inventory_lifecycle']);

export const productCurrency = (product) =>
  String(firstValue(product, ['currency', 'currency_code', 'currencyCode']) || 'SAR').toUpperCase();

export const productCountry = (product) =>
  firstValue(product, ['country', 'country_name', 'countryName', 'origin_country']);

export const productLocation = (product) =>
  firstValue(product, [
    'location', 'location_name', 'locationName', 'city', 'warehouse_city', 'warehouseCity',
  ]);

export const productSeller = (product) =>
  firstValue(product, ['seller_company', 'sellerCompany', 'supplier_company', 'supplierCompany'])
  || firstValue(product?.owner, ['company_name', 'companyName', 'name'])
  || firstValue(product, ['seller_name', 'sellerName', 'supplier_name', 'supplierName']);

export function sellerIdFromProduct(product) {
  if (!product) return '';
  const owner = product.owner_id ?? product.ownerId;
  if (owner != null && String(owner).trim()) return String(owner).trim();
  const nested = product.owner;
  if (nested && typeof nested === 'object') {
    const id = nested.id ?? nested._id;
    if (id != null && String(id).trim()) return String(id).trim();
  }
  return '';
}

export function productAvailableQuantity(product, size = null) {
  return Math.max(0, Math.floor(Number(stockForSize(product, size)) || 0));
}

export function requiredPurchaseQuantity(product, requested = 1, perPiece = false, size = null) {
  const stock = Math.max(0, Math.floor(Number(stockForSize(product, size)) || 0));
  if (stock < 1) return 0;
  // Approved B2B offer: buyer purchased the quantity they requested.
  if (product?._offerLocked) {
    const qty = Math.max(1, Math.floor(Number(requested) || 1));
    return Math.min(stock, qty);
  }
  if (!perPiece) return stock;
  const moq = Math.min(stock, productMoq(product));
  const quantity = Math.max(moq, Math.floor(Number(requested) || moq));
  return Math.min(stock, quantity);
}

export function purchaseQuantityError(line, perPiece, t, tf) {
  if (isAuctionWonCartItem(line)) return null;
  const stock = Math.max(
    0,
    Math.floor(Number(stockForSize(line?.product, line?.size || null)) || 0),
  );
  const quantity = Math.floor(Number(line?.quantity) || 0);
  if (stock < 1 || quantity > stock) return t('quantityExceedsStock');
  // Approved B2B offer: quantity is the amount the buyer requested.
  if (line?.product?._offerLocked || line?.offerLocked) {
    const moq = productMoq(line?.product);
    if (quantity < Math.min(stock, moq)) {
      return tf('moqQuantityRequired', { n: Math.min(stock, moq) });
    }
    return null;
  }
  if (!perPiece && quantity !== stock) {
    return tf('fullLotQuantityRequired', { n: stock });
  }
  const moq = productMoq(line?.product);
  if (perPiece && quantity < Math.min(stock, moq)) {
    return tf('moqQuantityRequired', { n: Math.min(stock, moq) });
  }
  return null;
}

export function normalizedFieldOptions(products, getter) {
  return [...new Set(
    (products || []).map(getter).filter(Boolean).map((value) => String(value).trim()),
  )].sort((a, b) => a.localeCompare(b));
}
