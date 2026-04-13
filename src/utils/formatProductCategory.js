/**
 * Same parsing as Mobile-production `ProductService.parseCategory` (split on `|`,
 * main = parts[0], sub = parts[1] only).
 */
export function parseProductCategory(raw) {
  if (raw == null || raw === '') return { category: null, subcategory: null };
  const trimmed = String(raw).trim();
  if (!trimmed) return { category: null, subcategory: null };
  if (!trimmed.includes('|')) {
    return { category: trimmed, subcategory: null };
  }
  const parts = trimmed.split('|');
  const category = (parts[0] ?? '').trim() || null;
  const sub = parts.length > 1 ? (parts[1] ?? '').trim() : '';
  return { category, subcategory: sub || null };
}

/**
 * Localized product category — mirrors `product_card.dart` + `LocalizationHelper`:
 * - If subcategory exists, show localized sub only.
 * - Else show localized main world.
 * - Unknown: return API segment unchanged (Flutter default branch).
 */
export function formatProductCategory(raw, t) {
  const { category: mainRaw, subcategory: subRaw } = parseProductCategory(raw);
  if (!mainRaw && !subRaw) return '';

  if (subRaw) {
    const key = resolveSubcategoryKey(subRaw);
    return key ? t(key) : subRaw;
  }

  const mainKey = resolveMainCategoryKey(mainRaw || '');
  return mainKey ? t(mainKey) : (mainRaw || '');
}

/** Localized chip label for a world’s sub slug (English key from dashboard / mobile map). */
export function formatSubcategoryChipLabel(worldId, subSlug, t) {
  if (!subSlug) return '';
  return formatProductCategory(`${worldId}|${subSlug}`, t);
}

function normalizeForMatch(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ');
}

function resolveMainCategoryKey(mainRaw) {
  const n = normalizeForMatch(mainRaw);
  const map = {
    fashion: 'catFashion',
    clothing: 'catFashion',
    homeliving: 'catHomeLiving',
    'home living': 'catHomeLiving',
    home: 'catHomeLiving',
    lifestyle: 'catLifestyle',
    'life style': 'catLifestyle',
    automotive: 'catAutomotive',
    construction: 'catConstruction',
    electronics: 'catElectronics',
  };
  return map[n] || null;
}

/** Normalized sub label → LanguageContext key (strings aligned with app_en.arb / app_ar.arb). */
function resolveSubcategoryKey(subRaw) {
  const n = normalizeForMatch(subRaw);
  const map = {
    other: 'subOther',
    'other accessories': 'subOther',
    bedding: 'subBedding',
    'home essentials': 'subHomeEssentials',
    'kitchen tools': 'subKitchenTools',
    'home decor': 'subHomeDecor',
    "men's clothing": 'subMensClothing',
    'mens clothing': 'subMensClothing',
    "women's clothing": 'subWomensClothing',
    'womens clothing': 'subWomensClothing',
    "kids' clothing": 'subKidsClothing',
    'kids clothing': 'subKidsClothing',
    accessories: 'subAccessories',
    bags: 'subBags',
    shoes: 'subShoes',
    'car accessories': 'subCarAccessories',
    equipment: 'subEquipment',
    'building materials': 'subBuildingMaterials',
    'power tools': 'subPowerTools',
    'plumbing tools': 'subPlumbingTools',
    'construction tools': 'subConstructionTools',
    'tech accessories': 'subTechAccessories',
    'electronics accessories': 'subTechAccessories',
    'office supplies': 'subOfficeSupplies',
    "kids' toys": 'subKidsToys',
    'kids toys': 'subKidsToys',
    smartphones: 'smartphones',
    laptops: 'laptops',
    tablets: 'tablets',
    cameras: 'cameras',
    gaming: 'gaming',
    watches: 'watches',
    fitness: 'fitness',
    outdoor: 'outdoor',
    'team sports': 'teamSports',
    'water sports': 'waterSports',
    cycling: 'cycling',
    running: 'running',
    skincare: 'skincare',
    makeup: 'makeup',
    fragrances: 'fragrances',
    haircare: 'haircare',
    'nail care': 'nailCare',
    'beauty tools': 'beautyTools',
    cookware: 'cookware',
    appliances: 'appliances',
    utensils: 'utensils',
    storage: 'storage',
    dining: 'dining',
    bakeware: 'bakeware',
    jewelry: 'jewelry',
    sunglasses: 'sunglasses',
    belts: 'belts',
    wallets: 'wallets',
  };
  return map[n] || null;
}
