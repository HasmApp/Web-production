import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingDown } from 'lucide-react';
import { fetchAppConfig } from '../services/api.js';
import useLiveProductCatalog from '../hooks/useLiveProductCatalog.js';
import ProductCard from '../components/product/ProductCard.jsx';
import CertifiedProductsBanner from '../components/shop/CertifiedProductsBanner.jsx';
import { tamaraArUrl, tamaraEnUrl } from '../assets/branding.js';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import TabEmptyState from '../components/layout/TabEmptyState.jsx';
import SubcategoryAuctionBlock from '../components/shop/SubcategoryAuctionBlock.jsx';
import AuctionRoomModal from '../components/auction/AuctionRoomModal.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { VISIBLE_SHOP_CATEGORIES } from '../constants/shopCategories.js';
import { buildDealsCatalog } from '../utils/productFeedFilters.js';
import { BOTTOM_NAV_EMPTY_STATE_CLEARANCE, SORT_SELECT_CLASS, PRODUCT_RAIL_CARD_CLASS } from '../design/shopTokens.js';

/** Products shown before the certified banner in the deals grid (matches home feed). */
const DEALS_GRID_CHUNK_SIZE = 4;

export default function DealsPage() {
  const { t, lang } = useLanguage();
  const { products, loading } = useLiveProductCatalog();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState(null);
  const [deliveryIsFree, setDeliveryIsFree] = useState(false);
  const [openAuctionRoomId, setOpenAuctionRoomId] = useState(null);

  const selectCategory = (id) => {
    setCategory(id);
    setSubcategory(null);
  };

  useEffect(() => {
    let cancelled = false;
    fetchAppConfig()
      .then((d) => {
        if (cancelled) return;
        const dp = Number(d?.delivery_price);
        setDeliveryIsFree(Number.isFinite(dp) && dp < 1e-9);
      })
      .catch(() => {
        if (!cancelled) setDeliveryIsFree(false);
      });
    return () => { cancelled = true; };
  }, []);

  const { promotions, deals } = useMemo(
    () => buildDealsCatalog(products, {
      search: search.trim(),
      sort,
      world: category,
      subcategory,
    }),
    [products, search, sort, category, subcategory],
  );

  const showEmpty = !loading && promotions.length === 0 && deals.length === 0;
  const firstDealsChunk = deals.slice(0, DEALS_GRID_CHUNK_SIZE);
  const restDealsChunk = deals.slice(DEALS_GRID_CHUNK_SIZE);
  const showCertifiedInGrid = !loading && deals.length > 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-4rem)]">
      <div className="sticky top-16 z-20 border-b border-gray-100 bg-gray-50/95 px-4 py-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t('shopNavDeals')}</h1>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-2">
          {VISIBLE_SHOP_CATEGORIES.map(({ id, labelKey, icon: Icon }) => (
            <button
              type="button"
              key={id || 'all'}
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="input w-full ps-9 h-10 text-sm"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={SORT_SELECT_CLASS}
            aria-label={t('sort')}
          >
            <option value="default">{t('priceDroppingSort')}</option>
            <option value="low">{t('priceLowHigh')}</option>
            <option value="high">{t('priceHighLow')}</option>
          </select>
        </div>
      </div>

      <div
        className="max-w-6xl mx-auto px-4 py-4"
        style={{ paddingBottom: BOTTOM_NAV_EMPTY_STATE_CLEARANCE + 24 }}
      >
        <SubcategoryAuctionBlock
          selectedWorld={category || null}
          selectedSubcategory={subcategory}
          onSubcategoryTap={setSubcategory}
          onOpenAuctionRoom={setOpenAuctionRoomId}
        />

        {!loading && !showEmpty ? (
          <section className="mb-6">
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
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 px-4 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('tamaraAdBadge')}
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {loading ? (
          <PageLoader />
        ) : showEmpty ? (
          <TabEmptyState
            icon={TrendingDown}
            title={t('noProductsFound')}
            description={t('homeFeedEmptyDeals')}
            action={<Link to="/marketplace" className="btn-primary">{t('browseProducts')}</Link>}
          />
        ) : (
          <>
            {promotions.length > 0 ? (
              <section className="mb-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                  {t('shopPromotion')}
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                  {promotions.map((product) => (
                    <div
                      key={product._id || product.id}
                      className={PRODUCT_RAIL_CARD_CLASS}
                    >
                      <ProductCard
                        product={product}
                        deliveryIsFree={deliveryIsFree}
                        dealPriceDisplay
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {deals.length > 0 ? (
              <section>
                <div className="mb-4 px-0.5">
                  <h2 className="section-title">{t('homeTabDeals')}</h2>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t('shopDealsSub')}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {firstDealsChunk.map((product) => (
                    <ProductCard
                      key={product._id || product.id}
                      product={product}
                      deliveryIsFree={deliveryIsFree}
                      dealPriceDisplay
                    />
                  ))}
                  {showCertifiedInGrid ? (
                    <div className="col-span-full my-1">
                      <CertifiedProductsBanner />
                    </div>
                  ) : null}
                  {restDealsChunk.map((product) => (
                    <ProductCard
                      key={product._id || product.id}
                      product={product}
                      deliveryIsFree={deliveryIsFree}
                      dealPriceDisplay
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>

      {openAuctionRoomId ? (
        <AuctionRoomModal
          roomId={openAuctionRoomId}
          onClose={() => setOpenAuctionRoomId(null)}
        />
      ) : null}
    </div>
  );
}
