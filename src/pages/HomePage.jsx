import { useState, useEffect, useMemo, Fragment } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingDown, Zap, Star, X, Search,
  LayoutGrid, Shirt, Home as HomeIcon, Leaf, UtensilsCrossed,
} from 'lucide-react';
import CertifiedProductsBanner from '../components/shop/CertifiedProductsBanner.jsx';
import SubcategoryAuctionBlock from '../components/shop/SubcategoryAuctionBlock.jsx';
import AuctionRoomModal from '../components/auction/AuctionRoomModal.jsx';
import ProductRailSection from '../components/shop/ProductRailSection.jsx';
import { fetchMyPriceRequests, fetchProductById } from '../services/api.js';
import useLiveProductCatalog from '../hooks/useLiveProductCatalog.js';
import ProductCard from '../components/product/ProductCard.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { tamaraArUrl, tamaraEnUrl } from '../assets/branding.js';
import { parseProductCategory, formatSubcategoryChipLabel } from '../utils/formatProductCategory.js';
import {
  productMatchesCategory as shopProductMatchesCategory,
  productMatchesSubcategory,
} from '../constants/shopCategories.js';
import { productCountLabel } from '../utils/productCountLabel.js';
import { isBundlePackageProduct } from '../utils/productFlags.js';
import {
  excludePackageProducts,
  excludeDealsPageProducts,
  filterInStock,
  sortProductsByPriceDecay,
  sortByPrice,
} from '../utils/productFeedFilters.js';
import { bestSellers, newArrivals } from '../utils/shopProductDisplay.js';
import { SORT_SELECT_CLASS } from '../design/shopTokens.js';
import { usePlatformConfig } from '../contexts/PlatformConfigContext.jsx';
import {
  normalizedFieldOptions,
  productCondition,
  productLifecycle,
  productLocation,
} from '../utils/b2bProduct.js';

/** IDs must match Dashboard / product-service (e.g. InsertProduct: Fashion, HomeLiving, LifeStyle, …). */
const CATEGORIES = [
  { id: '', labelKey: 'all', icon: LayoutGrid },
  { id: 'Fashion', labelKey: 'catFashion', icon: Shirt },
  { id: 'HomeLiving', labelKey: 'catHomeLiving', icon: HomeIcon },
  { id: 'Kitchen', labelKey: 'catKitchen', icon: UtensilsCrossed },
  { id: 'LifeStyle', labelKey: 'catLifestyle', icon: Leaf },
];

/** Same keys / English labels as Mobile-production `home_page.dart` `_subcategories`. */
const SUBCATEGORIES = {
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

function productIdKey(p) {
  if (!p) return '';
  return String(p._id ?? p.id ?? '').trim();
}

/** Show approved-offer home card only if stock can still fulfill the agreed quantity. */
function acceptedOfferEntryIsFulfillable(entry) {
  const p = entry?.product;
  if (!p) return false;
  const stock = Number(p.quantity ?? p.stock ?? 0);
  if (!Number.isFinite(stock) || stock < 1) return false;
  const need = Math.max(1, Math.floor(Number(entry?.request?.quantity ?? 1) || 1));
  return stock >= need;
}

/** ~2 rows before certified banner (matches mobile `firstGridChunkSize`). */
const HOME_GRID_CHUNK_SIZE = 4;

// LEGACY - The marketplace used to double as the public landing page.
// Its hero/stats/payment-promo sections are retained below for future
// reactivation, but hidden now that `/` is a dedicated HASM business landing
// page and `/marketplace` is focused on product discovery.
const SHOW_LEGACY_MARKETPLACE_HERO = false;
// LEGACY: accepted/private offers stay implemented, but the open marketplace
// must contain only listings authorized by the public marketplace endpoint.
const SHOW_LEGACY_ACCEPTED_OFFERS = false;

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const { isAuthenticated } = useAuth();
  const { t, lang } = useLanguage();
  const { addItem } = useCart();
  const { config, flags } = usePlatformConfig();
  const [searchInput, setSearchInput] = useState(q);

  const categoryLabel = (id) => {
    const c = CATEGORIES.find((x) => x.id === id);
    return c?.labelKey ? t(c.labelKey) : id;
  };

  const SORT_OPTIONS = [
    { value: 'default', label: t('priceDroppingSort') },
    { value: 'low',     label: t('priceLowHigh') },
    { value: 'high',    label: t('priceHighLow') },
  ];

  const { products, loading } = useLiveProductCatalog({
    enabled: flags.marketplace,
    marketplace: true,
  });
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState(null);
  const [lifecycle, setLifecycle] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState('default');
  const [acceptedOffers, setAcceptedOffers] = useState([]);
  const [deliveryIsFree, setDeliveryIsFree] = useState(false);
  const [openAuctionRoomId, setOpenAuctionRoomId] = useState(null);

  useEffect(() => {
    document.title = t('marketplaceDocumentTitle');
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', t('marketplaceMetaDescription'));
  }, [lang]);

  const selectCategory = (id) => {
    setCategory(id);
    setSubcategory(null);
  };
  useEffect(() => {
    const dp = Number(config?.delivery_price);
    setDeliveryIsFree(Number.isFinite(dp) && dp < 1e-9);
  }, [config]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isAuthenticated) {
        if (mounted) setAcceptedOffers([]);
        return;
      }
      try {
        const rows = await fetchMyPriceRequests();
        const approved = (Array.isArray(rows) ? rows : [])
          .filter((r) => String(r.status || '').toLowerCase() === 'approved');
        const entries = [];
        for (const row of approved) {
          try {
            const product = await fetchProductById(row.product_id);
            entries.push({ request: row, product });
          } catch {
            // Skip missing product
          }
        }
        if (mounted) setAcceptedOffers(entries);
      } catch {
        if (mounted) setAcceptedOffers([]);
      }
    })();
    return () => { mounted = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Filter + sort
  const applySearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set('q', searchInput.trim());
    else next.delete('q');
    setSearchParams(next);
  };

  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    const next = new URLSearchParams(searchParams);
    if (val.trim()) next.set('q', val.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    let list = filterInStock(products);
    list = excludePackageProducts(list);
    // Stock-type ("by pieces") toggle is retired; the home feed now shows both
    // full-stock and by-pieces products (standard dynamic products are created
    // as by-pieces, so filtering to full_stock hid most of them).
    list = excludeDealsPageProducts(list);
    list = list.filter((p) => {
      if (q) {
        const ql = q.toLowerCase();
        const blobs = [p.title_en, p.titleEn, p.title, p.title_ar, p.titleAr]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        if (!blobs.some((b) => b.includes(ql))) return false;
      }
      if (!shopProductMatchesCategory(p, category)) return false;
      if (subcategory && !productMatchesSubcategory(p, subcategory)) return false;
      if (lifecycle && String(productLifecycle(p)) !== lifecycle) return false;
      if (locationFilter && String(productLocation(p)) !== locationFilter) return false;
      if (condition && String(productCondition(p)) !== condition) return false;
      return true;
    });
    // Show the full catalog (admin-flagged deals already excluded above). Prices
    // cycle (decay to minimum, then reset to initial via the scheduler), so we no
    // longer drop products that are momentarily at their price floor.
    if (sort === 'low' || sort === 'high') {
      return sortByPrice(list, sort);
    }
    return sortProductsByPriceDecay(list);
  }, [products, q, category, subcategory, lifecycle, locationFilter, condition, sort]);

  const lifecycleOptions = useMemo(
    () => normalizedFieldOptions(products, productLifecycle),
    [products],
  );
  const locationOptions = useMemo(
    () => normalizedFieldOptions(products, productLocation),
    [products],
  );
  const conditionOptions = useMemo(
    () => normalizedFieldOptions(products, productCondition),
    [products],
  );

  const acceptedOffersVisible = useMemo(
    () => (SHOW_LEGACY_ACCEPTED_OFFERS ? acceptedOffers : []).filter(
      (e) => acceptedOfferEntryIsFulfillable(e) && !isBundlePackageProduct(e?.product),
    ),
    [acceptedOffers],
  );

  const acceptedOfferProductIds = useMemo(() => {
    const ids = new Set();
    for (const e of acceptedOffersVisible) {
      const fromProduct = productIdKey(e.product);
      if (fromProduct) ids.add(fromProduct);
      else {
        const pid = String(e.request?.product_id ?? '').trim();
        if (pid) ids.add(pid);
      }
    }
    return ids;
  }, [acceptedOffersVisible]);

  /** Avoid listing the same SKU twice (accepted row + catalog row). */
  const filteredForGrid = useMemo(
    () => filtered.filter((p) => !acceptedOfferProductIds.has(productIdKey(p))),
    [filtered, acceptedOfferProductIds],
  );

  /** Catalog slice for Best Sellers / New Arrivals rails (matches mobile `_buildCatalogProducts`). */
  const catalogForCarousels = useMemo(() => {
    let list = filterInStock(products);
    list = excludePackageProducts(list);
    list = excludeDealsPageProducts(list);
    return list.filter((p) => {
      if (!shopProductMatchesCategory(p, category)) return false;
      if (subcategory && !productMatchesSubcategory(p, subcategory)) return false;
      return true;
    });
  }, [products, category, subcategory]);

  const bestSellerProducts = useMemo(
    () => bestSellers(catalogForCarousels, { limit: 10 }),
    [catalogForCarousels],
  );

  const newArrivalProducts = useMemo(
    () => newArrivals(catalogForCarousels, { limit: 10 }),
    [catalogForCarousels],
  );

  const visibleGridCount =
    acceptedOffersVisible.length + filteredForGrid.length;

  const firstCatalogChunk = useMemo(
    () => filteredForGrid.slice(0, HOME_GRID_CHUNK_SIZE),
    [filteredForGrid],
  );
  const restCatalogChunk = useMemo(
    () => filteredForGrid.slice(HOME_GRID_CHUNK_SIZE),
    [filteredForGrid],
  );
  const showCertifiedInGrid = firstCatalogChunk.length > 0;

  const handleAcceptedOfferClick = (entry) => {
    // Match mobile home: add to cart and go to checkout with no toast (snackbar only
    // on checkout when coming from product-page auto-approve flow).
    const requestQty = Number(entry?.request?.quantity || 1);
    const offered = Number(entry?.request?.offered_price || 0);
    const product = entry.product || {};
    const patched = {
      ...product,
      current_price: offered,
      currentPrice: offered,
      initial_price: offered,
      initialPrice: offered,
    };
    addItem(patched, requestQty > 0 ? requestQty : 1, 'Full');
    navigate('/cart');
  };

  return (
    <div className="min-h-screen">
      {SHOW_LEGACY_MARKETPLACE_HERO && (
      <>
      {/* Hero — LTR grid: app card left, copy & CTAs right (Arabic copy is RTL inside the right column) */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-primary-700 via-primary to-violet-600 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.15]">
          <div className="absolute -top-24 end-0 h-80 w-80 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 start-10 h-64 w-64 rounded-full bg-violet-300 blur-3xl" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:100%_4rem] opacity-30" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-16 pt-10 sm:pb-24 sm:pt-14">
          <div
            className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-6 xl:gap-8"
            dir="ltr"
          >
            {/* Badges — left in Arabic, right in English */}
            <aside className={`order-2 flex justify-center lg:col-span-4 xl:col-span-3 ${
              lang === 'ar'
                ? 'lg:order-none lg:justify-start'
                : 'lg:order-last lg:justify-end'
            }`}>
              <div className="w-full max-w-[19rem] sm:max-w-[21rem]">
                <div className="flex flex-col gap-4">
                  <a
                    href="https://apps.apple.com/sa/app/hasm/id6756539653"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-[62px] items-center justify-center rounded-2xl sm:h-[68px]"
                    aria-label={t('heroAppStoreAria')}
                  >
                    <img
                      src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                      alt=""
                      className="h-full w-full max-w-[240px] object-contain transition group-hover:scale-[1.02]"
                    />
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.hasm.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-[62px] items-center justify-center rounded-2xl sm:h-[68px]"
                    aria-label={t('heroGooglePlayAria')}
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                      alt=""
                      className="h-full w-full max-w-[240px] object-contain transition group-hover:scale-[1.02]"
                    />
                  </a>
                </div>
              </div>
            </aside>

            {/* Right: headline, body, actions */}
            <div
              className={`order-1 flex min-w-0 flex-col lg:order-none lg:col-span-8 xl:col-span-9 ${
                lang === 'ar'
                  ? 'items-start text-right lg:ps-8 xl:ps-12'
                  : 'items-start text-left lg:pe-8 xl:pe-12'
              }`}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div
                className={`mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-md ${
                  lang === 'ar' ? 'self-start' : 'self-start'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {t('livePrice')}
              </div>
              <h1 className="max-w-2xl text-balance text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl xl:text-[3.35rem]">
                {t('heroTitle')
                  .split('\n')
                  .filter((line) => line.trim())
                  .map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 ? <br /> : null}
                      {line}
                    </Fragment>
                  ))}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg lg:text-xl">
                {t('heroDesc')}
              </p>

              <CertifiedProductsBanner variant="hero" className="mt-7" />

              <div className={`mt-6 flex flex-wrap gap-3 sm:gap-4 ${lang === 'ar' ? 'justify-start w-full' : 'justify-start'}`}>
                <a
                  href="#products"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-primary shadow-lg shadow-black/10 transition hover:bg-primary-50 hover:shadow-xl sm:px-7 sm:text-base"
                >
                  <HomeIcon className="h-5 w-5 shrink-0" />
                  {t('shopNow')}
                </a>
                <Link
                  to="/deals"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/15 sm:px-7 sm:text-base"
                >
                  <TrendingDown className="h-5 w-5 shrink-0" />
                  {t('shopNavDeals')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
            {[
              { icon: Zap, label: t('heroStatRealtime'), value: t('heroValueLive') },
              { icon: TrendingDown, label: t('heroStatDropping'), value: t('heroValueDropping') },
              { icon: Star, label: t('heroStatSavings'), value: t('heroValueDaily') },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4 px-4">
                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-center sm:text-start">
                  <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{value}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tamara banner — full width (certified strip is woven into the product grid below) */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5">
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6" dir="ltr">
                <div className={`flex-shrink-0 ${lang === 'ar' ? 'sm:order-4' : 'sm:order-1'}`}>
                  <img
                    src={lang === 'ar' ? tamaraArUrl : tamaraEnUrl}
                    alt="Tamara"
                    className="h-12 sm:h-14 w-auto object-contain rounded-xl"
                  />
                </div>
                <div className={`hidden sm:block w-px h-12 bg-gray-200 dark:bg-gray-700 flex-shrink-0 ${lang === 'ar' ? 'sm:order-3' : 'sm:order-2'}`} />
                <div className={`flex-1 min-w-0 text-center ${lang === 'ar' ? 'sm:order-2 sm:text-right' : 'sm:order-3 sm:text-left'}`}>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {t('tamaraAdHeadline')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('tamaraAdSub')}
                  </p>
                </div>
                <div className={`flex-shrink-0 ${lang === 'ar' ? 'sm:order-1' : 'sm:order-4'}`}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8e9ff] dark:bg-purple-900/30 px-4 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {t('tamaraAdBadge')}
                  </span>
                </div>
            </div>
          </div>
        </div>
      </section>
      </>
      )}

      {/* Products section */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <form onSubmit={applySearch} className="w-full max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rtl:left-auto rtl:right-3" />
              <input
                type="search"
                value={searchInput}
                onChange={handleSearchInputChange}
                placeholder={t('search')}
                className="input w-full pl-11 rtl:pl-4 rtl:pr-11 py-2.5 rounded-xl"
                aria-label={t('search')}
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-xs py-1.5 px-3 rounded-lg rtl:right-auto rtl:left-2">
                {t('searchAction')}
              </button>
            </div>
          </form>
          <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="section-title">
              {q ? `${t('results')} "${q}"` : category ? categoryLabel(category) : t('allProducts')}
            </h2>
            {!loading && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                {visibleGridCount} {productCountLabel(visibleGridCount, lang, t)}
              </p>
            )}
          </div>
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={SORT_SELECT_CLASS}
            aria-label={t('sort')}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-20 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 text-start">{t('category')}</h3>
                <div className="space-y-1">
                  {CATEGORIES.map(({ id, labelKey, icon: Icon }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => selectCategory(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-start transition-colors ${
                        category === id
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {t(labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {category && (SUBCATEGORIES[category]?.length > 0) && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 text-start">{t('subcategory')}</h3>
                  <div className="flex flex-col gap-1.5 items-stretch">
                    <button
                      type="button"
                      onClick={() => setSubcategory(null)}
                      className={`w-full flex items-center justify-start px-3 py-2 rounded-lg text-xs font-medium text-start transition-colors ${
                        subcategory == null
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {t('all')}
                    </button>
                    {SUBCATEGORIES[category].map((sub) => (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => setSubcategory(sub)}
                        className={`w-full flex items-center justify-start px-3 py-2 rounded-lg text-xs font-medium text-start transition-colors ${
                          subcategory === sub
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {formatSubcategoryChipLabel(category, sub, t)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile categories scroll */}
            <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
              {CATEGORIES.map(({ id, labelKey, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => selectCategory(id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                    category === id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {t(labelKey)}
                </button>
              ))}
            </div>

            <SubcategoryAuctionBlock
              selectedWorld={category || null}
              selectedSubcategory={subcategory}
              onSubcategoryTap={setSubcategory}
              onOpenAuctionRoom={setOpenAuctionRoomId}
            />

            {!q && !loading ? (
              <>
                <ProductRailSection
                  title={t('shopBestSellers')}
                  subtitle={t('shopBestSellersSub')}
                  products={bestSellerProducts}
                  deliveryIsFree={deliveryIsFree}
                />
                <ProductRailSection
                  title={t('shopNewArrivals')}
                  subtitle={t('shopNewArrivalsSub')}
                  products={newArrivalProducts}
                  deliveryIsFree={deliveryIsFree}
                />
                <div className="mb-4 px-0.5">
                  <h2 className="section-title">{t('homeTabNewProducts')}</h2>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t('shopTrendingSub')}
                  </p>
                </div>
              </>
            ) : null}

            {/* Active filters */}
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                [lifecycle, setLifecycle, t('filterLifecycle'), lifecycleOptions],
                [locationFilter, setLocationFilter, t('filterLocation'), locationOptions],
                [condition, setCondition, t('filterCondition'), conditionOptions],
              ].map(([value, setter, label, options]) => (
                <select
                  key={label}
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                  className={SORT_SELECT_CLASS}
                  aria-label={label}
                >
                  <option value="">{label}: {t('all')}</option>
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ))}
            </div>

            {(category || subcategory || lifecycle || locationFilter || condition || q) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {category && (
                  <span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary gap-1.5">
                    {categoryLabel(category)}
                    <button type="button" onClick={() => selectCategory('')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {subcategory && category && (
                  <span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary gap-1.5">
                    {formatSubcategoryChipLabel(category, subcategory, t)}
                    <button type="button" onClick={() => setSubcategory(null)}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {q && (
                  <span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary gap-1.5">
                    "{q}"
                    <button type="button" onClick={() => { setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('q'); return n; }); }}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {lifecycle && (
                  <span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary gap-1.5">
                    {lifecycle}
                    <button type="button" onClick={() => setLifecycle('')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {locationFilter && (
                  <span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary gap-1.5">
                    {locationFilter}
                    <button type="button" onClick={() => setLocationFilter('')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {condition && (
                  <span className="badge bg-primary-50 dark:bg-primary-900/20 text-primary gap-1.5">
                    {condition}
                    <button type="button" onClick={() => setCondition('')}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <PageLoader />
            ) : filtered.length === 0 && acceptedOffers.length === 0 ? (
              <EmptyState
                icon={TrendingDown}
                title={t('noProductsFound')}
                description={t('tryDifferent')}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      selectCategory('');
                      setLifecycle('');
                      setLocationFilter('');
                      setCondition('');
                      setSearchParams({});
                      setSearchInput('');
                    }}
                    className="btn-primary"
                  >
                    {t('clearFilters')}
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {acceptedOffersVisible.map((entry) => (
                  <ProductCard
                    key={`accepted-${entry.request.id}`}
                    product={entry.product}
                    deliveryIsFree={deliveryIsFree}
                    acceptedOffer={{
                      price: Number(entry.request.offered_price || 0),
                      quantity: Number(entry.request.quantity || 1) || 1,
                    }}
                    onAcceptedClick={() => handleAcceptedOfferClick(entry)}
                  />
                ))}
                {firstCatalogChunk.map((product) => (
                  <ProductCard key={product._id} product={product} deliveryIsFree={deliveryIsFree} />
                ))}
                {showCertifiedInGrid ? (
                  <div className="col-span-full my-1">
                    <CertifiedProductsBanner />
                  </div>
                ) : null}
                {restCatalogChunk.map((product) => (
                  <ProductCard key={product._id} product={product} deliveryIsFree={deliveryIsFree} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {openAuctionRoomId ? (
        <AuctionRoomModal
          roomId={openAuctionRoomId}
          onClose={() => setOpenAuctionRoomId(null)}
        />
      ) : null}
    </div>
  );
}
