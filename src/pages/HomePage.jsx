import { useState, useEffect, useRef, Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  TrendingDown, Zap, Gavel, Star, X, Search, BadgeCheck,
  LayoutGrid, Shirt, Home as HomeIcon, Leaf, Car, HardHat,
} from 'lucide-react';
import { fetchProducts } from '../services/api.js';
import ProductCard from '../components/product/ProductCard.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import config from '../config/config.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { tamaraArUrl, tamaraEnUrl } from '../assets/branding.js';
import { parseProductCategory, formatSubcategoryChipLabel } from '../utils/formatProductCategory.js';
import { productCountLabel } from '../utils/productCountLabel.js';

/** IDs must match Dashboard / product-service (e.g. InsertProduct: Fashion, HomeLiving, LifeStyle, …). */
const CATEGORIES = [
  { id: '', labelKey: 'all', icon: LayoutGrid },
  { id: 'Fashion', labelKey: 'catFashion', icon: Shirt },
  { id: 'HomeLiving', labelKey: 'catHomeLiving', icon: HomeIcon },
  { id: 'LifeStyle', labelKey: 'catLifestyle', icon: Leaf },
  { id: 'Automotive', labelKey: 'catAutomotive', icon: Car },
  { id: 'Construction', labelKey: 'catConstruction', icon: HardHat },
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
  HomeLiving: ['Bedding', 'Home Essentials', 'Kitchen Tools', 'Home Decor', 'Other'],
  LifeStyle: ['Tech Accessories', 'Office Supplies', "Kids' Toys", 'Other'],
  Automotive: ['Car Accessories', 'Equipment', 'Other'],
  Construction: ['Building Materials', 'Power Tools', 'Plumbing Tools', 'Construction Tools', 'Other'],
};

/** Match API format: exact "Fashion" or "Fashion|Subcategory" (see product-service search_products). */
function productMatchesCategory(product, categoryId) {
  if (!categoryId) return true;
  const raw = (product.category ?? '').toString().trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  const want = categoryId.toLowerCase();
  if (lower === want || lower.startsWith(`${want}|`)) return true;
  const main = lower.split('|')[0] || lower;
  // Legacy rows may use "Home" before dashboard standardized on "HomeLiving"
  if (want === 'homeliving' && main === 'home') return true;
  return false;
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const { isAuthenticated } = useAuth();
  const { t, lang } = useLanguage();
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

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState(null);
  const [sort, setSort] = useState('default');

  const selectCategory = (id) => {
    setCategory(id);
    setSubcategory(null);
  };
  const wsRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : data?.items || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Polling fallback — keep prices fresh for all users (especially Safari/iOS where
  // background timers can be throttled).
  useEffect(() => {
    let dead = false;
    let timer = null;

    const refresh = async () => {
      try {
        const data = await fetchProducts();
        const list = Array.isArray(data) ? data : data?.items || [];
        if (!dead) setProducts(list);
      } catch {
        // best-effort fallback
      }
    };

    const schedule = () => {
      if (dead) return;
      const ms = document.hidden ? 25000 : 8000;
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, ms);
    };

    // Kick once, then continue with adaptive interval.
    refresh();
    schedule();

    const onResume = () => {
      // Force an immediate refresh when tab/app returns to foreground.
      refresh();
    };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);

    return () => {
      dead = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
    };
  }, []);

  // WebSocket real-time price updates.
  // If no token is present, still attempt /ws/prices; backend may allow public feed.
  // If backend rejects it, polling above remains the source of truth.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    let ws = null;
    let dead = false;

    // 300ms debounce — absorbs React StrictMode's synchronous mount/unmount/remount
    // and rapid isAuthenticated flips during auth context init.
    const timer = setTimeout(() => {
      if (dead) return;
      try {
        const url = token
          ? `${config.wsBaseUrl}/ws/prices?token=${token}`
          : `${config.wsBaseUrl}/ws/prices`;
        ws = new WebSocket(url);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            const update = msg.type === 'price_update' ? msg.data : msg;
            if (update.product_id && update.current_price !== undefined) {
              setProducts((prev) =>
                prev.map((p) =>
                  (p._id === update.product_id || p.id === update.product_id)
                    ? { ...p, current_price: update.current_price }
                    : p
                )
              );
            }
          } catch {}
        };
        ws.onerror = () => {};  // suppress uncaught error events
        wsRef.current = ws;
      } catch {}
    }, 300);

    return () => {
      dead = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [isAuthenticated]);

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

  const filtered = products
    .filter((p) => {
      if (q) {
        const ql = q.toLowerCase();
        const blobs = [p.title_en, p.titleEn, p.title, p.title_ar, p.titleAr]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        if (!blobs.some((b) => b.includes(ql))) return false;
      }
      if (!productMatchesCategory(p, category)) return false;
      if (subcategory) {
        const { subcategory: prodSub } = parseProductCategory(p.category);
        if (!prodSub || prodSub.toLowerCase() !== subcategory.toLowerCase()) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const pa = a.current_price ?? a.currentPrice ?? 0;
      const pb = b.current_price ?? b.currentPrice ?? 0;
      if (sort === 'low') return pa - pb;
      if (sort === 'high') return pb - pa;
      // Default: fastest dropping (largest % drop)
      const dropA = ((a.initial_price - pa) / (a.initial_price || 1));
      const dropB = ((b.initial_price - pb) / (b.initial_price || 1));
      return dropB - dropA;
    });

  return (
    <div className="min-h-screen">
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

              {/* Certified stamp */}
              <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 self-start">
                {/* Stamp icon */}
                <div className="relative flex-shrink-0 w-10 h-10">
                  <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full">
                    <circle cx="20" cy="20" r="18.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="3.5 2.5" />
                    <circle cx="20" cy="20" r="14" fill="rgba(16,185,129,0.85)" />
                    <polyline points="12,20 17,25 28,14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                  <p className="text-sm font-bold text-white leading-tight">{t('certifiedTitle')}</p>
                  <p className="text-xs text-white/70 mt-0.5">{t('certifiedSub')}</p>
                </div>
              </div>

              <div className={`mt-6 flex flex-wrap gap-3 sm:gap-4 ${lang === 'ar' ? 'justify-start w-full' : 'justify-start'}`}>
                {lang === 'ar' ? (
                  <>
                    <a
                      href="#products"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-primary shadow-lg shadow-black/10 transition hover:bg-primary-50 hover:shadow-xl sm:px-7 sm:text-base"
                    >
                      <TrendingDown className="h-5 w-5 shrink-0" />
                      {t('shopNow')}
                    </a>
                    <Link
                      to="/auctions"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/15 sm:px-7 sm:text-base"
                    >
                      <Gavel className="h-5 w-5 shrink-0" />
                      {t('liveAuctions')}
                    </Link>
                  </>
                ) : (
                  <>
                    <a
                      href="#products"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-primary shadow-lg shadow-black/10 transition hover:bg-primary-50 hover:shadow-xl sm:px-7 sm:text-base"
                    >
                      <TrendingDown className="h-5 w-5 shrink-0" />
                      {t('shopNow')}
                    </a>
                    <Link
                      to="/auctions"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/15 sm:px-7 sm:text-base"
                    >
                      <Gavel className="h-5 w-5 shrink-0" />
                      {t('liveAuctions')}
                    </Link>
                  </>
                )}
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

      {/* Tamara ad banner */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8" dir="ltr">
            {/* Logo — order-4 in AR (rightmost) */}
            <div className={`flex-shrink-0 ${lang === 'ar' ? 'sm:order-4' : 'sm:order-1'}`}>
              <img
                src={lang === 'ar' ? tamaraArUrl : tamaraEnUrl}
                alt="Tamara"
                className="h-12 sm:h-14 w-auto object-contain rounded-xl"
              />
            </div>

            {/* Divider — stays next to logo, order-3 in AR */}
            <div className={`hidden sm:block w-px h-12 bg-gray-200 dark:bg-gray-700 flex-shrink-0 ${lang === 'ar' ? 'sm:order-3' : 'sm:order-2'}`} />

            {/* Text — order-2 in AR */}
            <div className={`flex-1 min-w-0 text-center ${lang === 'ar' ? 'sm:order-2 sm:text-right' : 'sm:order-3 sm:text-left'}`}>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {t('tamaraAdHeadline')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('tamaraAdSub')}
              </p>
            </div>

            {/* Badge — order-1 in AR (leftmost) */}
            <div className={`flex-shrink-0 ${lang === 'ar' ? 'sm:order-1' : 'sm:order-4'}`}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8e9ff] dark:bg-purple-900/30 px-4 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                {t('tamaraAdBadge')}
              </span>
            </div>
          </div>
        </div>
      </section>

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
                {filtered.length} {productCountLabel(filtered.length, lang, t)}
              </p>
            )}
          </div>
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input w-auto text-sm py-2 pr-8 cursor-pointer"
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

            {category && (SUBCATEGORIES[category]?.length > 0) && (
              <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-2">
                <button
                  type="button"
                  onClick={() => setSubcategory(null)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                    subcategory == null
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {t('all')}
                </button>
                {SUBCATEGORIES[category].map((sub) => (
                  <button
                    type="button"
                    key={sub}
                    onClick={() => setSubcategory(sub)}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      subcategory === sub
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {formatSubcategoryChipLabel(category, sub, t)}
                  </button>
                ))}
              </div>
            )}

            {/* Active filters */}
            {(category || subcategory || q) && (
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
              </div>
            )}

            {loading ? (
              <PageLoader />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={TrendingDown}
                title={t('noProductsFound')}
                description={t('tryDifferent')}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      selectCategory('');
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
                {filtered.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
