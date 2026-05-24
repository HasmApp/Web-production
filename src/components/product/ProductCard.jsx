import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Package, BadgeCheck, Truck, ArrowRight, Gavel } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../../services/api.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import SarAmount from '../common/SarAmount.jsx';
import { formatProductCategory } from '../../utils/formatProductCategory.js';
import {
  isPickupOnlyProduct,
  isPromotionProduct,
  isAuctionProduct,
} from '../../utils/productFlags.js';
import { FLASH_GRADIENT, LIVE_PRICE_TEXT_CLASS } from '../../design/shopTokens.js';
import { dealDiscountPercent } from '../../utils/productFeedFilters.js';
import PickupOnlyBadge from '../common/PickupOnlyBadge.jsx';

const FAVORITES_KEY = 'hasm_favorites';

const getFavorites = () => {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
  catch { return []; }
};

export default function ProductCard({
  product,
  acceptedOffer = null,
  onAcceptedClick,
  /** When true, show a small free-delivery tag (matches mobile when delivery fee is 0). */
  deliveryIsFree = false,
  /** Deals tab: show minimum price + initial strikethrough (matches mobile `dealPriceDisplay`). */
  dealPriceDisplay = false,
}) {
  const { lang, t, tf } = useLanguage();
  const isAccepted = acceptedOffer != null && typeof onAcceptedClick === 'function';
  const [isFav, setIsFav] = useState(false);
  const [priceChanged, setPriceChanged] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(
    product.current_price ?? product.currentPrice ?? 0
  );

  useEffect(() => {
    const favs = getFavorites();
    setIsFav(favs.includes(product._id));
  }, [product._id]);

  useEffect(() => {
    if (isAccepted || dealPriceDisplay) return;
    const newPrice = product.current_price ?? product.currentPrice ?? 0;
    if (newPrice !== displayPrice) {
      setPriceChanged(true);
      setDisplayPrice(newPrice);
      setTimeout(() => setPriceChanged(false), 600);
    }
  }, [product.current_price, product.currentPrice, isAccepted, dealPriceDisplay]);

  const minimum = product.minimum_price ?? product.minimumPrice ?? 0;
  const toggleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const favs = getFavorites();
    const newFavs = isFav
      ? favs.filter((id) => id !== product._id)
      : [...favs, product._id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
    setIsFav(!isFav);
    toast(isFav ? t('favRemovedToast') : t('favAddedToast'));
  };

  const initial = product.initial_price ?? product.initialPrice ?? 0;
  const offered = acceptedOffer?.price;
  const current = offered != null
    ? offered
    : (dealPriceDisplay ? minimum : displayPrice);
  const strikePrice = dealPriceDisplay ? initial : initial;
  const image = resolveMediaUrl((product.images?.[0]) || product.image || '');
  const title =
    lang === 'ar'
      ? (product.title_ar || product.titleAr || product.title || '')
      : (product.title_en || product.titleEn || product.title || '');
  const categoryLabel = formatProductCategory(product.category || '', t);
  const pickupOnly = isPickupOnlyProduct(product);
  const hasPromotion = isPromotionProduct(product);
  const isLiveAuction = isAuctionProduct(product);
  const discountPct = dealPriceDisplay && !isAccepted ? dealDiscountPercent(product) : null;
  const hasLiveDiscount = !isAccepted && strikePrice > current;

  const shellClass = `group flex flex-col min-w-0 text-start no-underline text-inherit rounded-xl bg-white dark:bg-gray-900 shadow-md transition-all duration-300 hover:opacity-[0.97] ${
    isAccepted
      ? 'border-2 border-emerald-500/90 dark:border-emerald-400/80'
      : ''
  }`;

  const body = (
    <>
      {/* Image — white frame + ~0.92 aspect (matches mobile ProductCard) */}
      <div className="px-2 pt-2">
        <div
          className={`relative w-full overflow-hidden rounded-xl bg-white aspect-[100/82] ${
            isAccepted
              ? 'ring-2 ring-inset ring-emerald-500/80 dark:ring-emerald-400/70'
              : ''
          }`}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-700">
              <Package className="h-12 w-12" strokeWidth={1} />
            </div>
          )}
          <button
            type="button"
            onClick={toggleFav}
            className={`absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
              isFav
                ? 'bg-red-500 text-white'
                : 'bg-white/90 text-gray-400 hover:text-red-500 dark:bg-gray-800/90'
            }`}
          >
            <Heart className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
          </button>
          {!isAccepted && hasPromotion ? (
            <div
              className="absolute top-3 start-3 rounded-lg px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md sm:text-xs"
              style={{ background: FLASH_GRADIENT }}
              dir="auto"
            >
              {t('badgeBogoFree')}
            </div>
          ) : null}
          {!isAccepted && discountPct != null ? (
            <div
              className="absolute bottom-3 end-3 flex min-h-[18px] items-center justify-center rounded bg-[#C05050] px-1.5 text-[10px] font-bold leading-none text-white"
              dir="auto"
              aria-label={tf('percentOff', { n: discountPct })}
            >
              {tf('badgeDealSticker', { n: discountPct })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 py-1.5">
        {categoryLabel ? (
          <p className="text-sm font-semibold leading-snug text-primary mb-1" dir="auto">
            {categoryLabel}
          </p>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
          {title}
        </h3>
        {/* Quantity/stock hidden by request */}
        <div className="mt-auto pt-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <SarAmount
              amount={current}
              iconSize={15}
              className={`text-lg font-bold transition-all duration-300 ${
                isAccepted
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : hasLiveDiscount
                    ? `${LIVE_PRICE_TEXT_CLASS} ${priceChanged ? 'scale-110' : ''}`
                    : `text-gray-900 dark:text-white ${priceChanged ? 'scale-110' : ''}`
              }`}
              numberClassName={`text-lg font-bold ${
                isAccepted
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : hasLiveDiscount
                    ? LIVE_PRICE_TEXT_CLASS
                    : 'text-gray-900 dark:text-white'
              }`}
            />
          </div>
          {!isAccepted && strikePrice > current && (
            <p className="mt-0.5 text-sm text-gray-400 line-through decoration-2 decoration-gray-400">
              <SarAmount
                amount={strikePrice}
                iconSize={13}
                className="text-sm text-gray-400 line-through decoration-2 decoration-gray-400"
                numberClassName="text-gray-400 line-through decoration-2 decoration-gray-400"
              />
            </p>
          )}
          {isAccepted && initial > current && (
            <p className="mt-0.5 text-sm text-gray-400 line-through decoration-2 decoration-gray-400">
              <SarAmount
                amount={initial}
                iconSize={13}
                className="text-sm text-gray-400 line-through decoration-2 decoration-gray-400"
                numberClassName="text-gray-400 line-through decoration-2 decoration-gray-400"
              />
            </p>
          )}
          {isAccepted ? (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
              <BadgeCheck className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden />
              {t('acceptedOffer')}
            </div>
          ) : null}
          {!isAccepted && isLiveAuction ? (
            <div className="mt-1.5 inline-flex max-w-full items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[8px] font-bold text-white">
              <Gavel className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
              <span className="leading-tight">{t('productAuctionBadge')}</span>
            </div>
          ) : null}
          {!isAccepted && pickupOnly ? (
            <div className="mt-1.5">
              <PickupOnlyBadge />
            </div>
          ) : null}
          {!isAccepted && deliveryIsFree && !pickupOnly ? (
            <div className="mt-1.5 inline-flex max-w-full items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[8px] font-bold text-white">
              <Truck className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
              <span className="leading-tight">{t('badgeFreeDelivery')}</span>
            </div>
          ) : null}
          {!isAccepted ? (
            <div className="mt-2">
              <div className="btn-primary w-full py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" />
                {t('viewProduct')}
              </div>
            </div>
          ) : null}
          {isAccepted ? (
            <div className="mt-2">
              <div className="btn-primary w-full py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" />
                {lang === 'ar' ? 'شراء' : 'Purchase'}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  if (isAccepted) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onAcceptedClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAcceptedClick();
          }
        }}
        className={`${shellClass} cursor-pointer`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link to={`/product/${product._id}`} className={shellClass}>
      {body}
    </Link>
  );
}
