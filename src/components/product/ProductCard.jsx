// B2B marketplace card: MOQ, stock, condition, location, and offer CTA.
// The previous live-price / add-to-cart card remains in git history
// (src/components/product/ProductCard.jsx on hasm-platform-v2).
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Package, BadgeCheck, MapPin, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../../services/api.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import SarAmount from '../common/SarAmount.jsx';
import { formatProductCategory } from '../../utils/formatProductCategory.js';
import { isPickupOnlyProduct } from '../../utils/productFlags.js';
import PickupOnlyBadge from '../common/PickupOnlyBadge.jsx';
import {
  productAvailableQuantity,
  productCondition,
  productLocation,
  productMoq,
  productSeller,
  productUnit,
  localizeProductCondition,
} from '../../utils/b2bProduct.js';

const FAVORITES_KEY = 'hasm_favorites';

const getFavorites = () => {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
  catch { return []; }
};

export default function ProductCard({
  product,
  acceptedOffer = null,
  onAcceptedClick,
  approvedOffer = null,
}) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { lang, t, tf } = useLanguage();
  const isAccepted = acceptedOffer != null && typeof onAcceptedClick === 'function';
  const [isFav, setIsFav] = useState(false);
  const publicApproved = approvedOffer != null && Number(approvedOffer.offered_price) > 0;
  const approvedQty = Math.max(1, Math.floor(Number(approvedOffer?.quantity || acceptedOffer?.quantity || 1)));
  const approvedTotal = Number(approvedOffer?.offered_price ?? acceptedOffer?.price ?? 0);

  useEffect(() => {
    const favs = getFavorites();
    setIsFav(favs.includes(product._id));
  }, [product._id]);

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

  const handlePurchase = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAccepted) {
      onAcceptedClick();
      return;
    }
    if (!publicApproved || approvedTotal <= 0) return;
    const unit = approvedTotal / approvedQty;
    addItem(
      { ...product, current_price: unit, currentPrice: unit, _offerLocked: true },
      approvedQty,
      'Full',
    );
    navigate('/cart', { replace: true });
  };

  const image = resolveMediaUrl((product.images?.[0]) || product.image || '');
  const title =
    lang === 'ar'
      ? (product.title_ar || product.titleAr || product.title || '')
      : (product.title_en || product.titleEn || product.title || '');
  const categoryLabel = formatProductCategory(product.category || '', t);
  const pickupOnly = isPickupOnlyProduct(product);
  const unit = productUnit(product) || t('units');
  const moq = productMoq(product);
  const available = productAvailableQuantity(product);
  const condition = productCondition(product);
  const location = productLocation(product);
  const seller = productSeller(product);

  const shellClass = `group flex flex-col min-w-0 text-start no-underline text-inherit rounded-xl bg-white dark:bg-gray-900 shadow-md transition-all duration-300 hover:opacity-[0.97] ${
    isAccepted || publicApproved
      ? 'border-2 border-emerald-500/90 dark:border-emerald-400/80'
      : ''
  }`;

  const body = (
    <>
      <div className="px-2 pt-2">
        <div className="relative w-full overflow-hidden rounded-xl bg-white aspect-[100/82]">
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
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-2 py-1.5 pb-3">
        {categoryLabel ? (
          <p className="text-sm font-semibold leading-snug text-primary mb-0.5" dir="auto">
            {categoryLabel}
          </p>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
          {title}
        </h3>
        <div className="flex flex-wrap gap-1 pt-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
            {t('b2bMoq')}: {moq} {unit}
          </span>
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
            {tf('availableQuantityChip', { n: available, unit })}
          </span>
          {condition ? (
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">{localizeProductCondition(condition, t)}</span>
          ) : null}
        </div>
        {location ? (
          <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400" dir="auto">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {location}
          </p>
        ) : null}
        {seller ? (
          <p className="flex w-full items-center justify-start gap-1 truncate text-start text-xs text-gray-500 dark:text-gray-400">
            <Building2 className="h-3 w-3 shrink-0" aria-hidden />
            <span className="min-w-0 truncate text-start">{seller}</span>
          </p>
        ) : null}
        {pickupOnly ? (
          <div className="pt-0.5">
            <PickupOnlyBadge size="sm" />
          </div>
        ) : null}

        <div className="mt-auto space-y-2 pt-2">
          {(isAccepted || publicApproved) && approvedTotal > 0 ? (
            <div className="space-y-1">
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                <BadgeCheck className="h-3 w-3" />
                {t('approvedPackagePrice')}
              </p>
              <SarAmount
                amount={approvedTotal}
                iconSize={15}
                className="text-lg font-bold text-emerald-600 dark:text-emerald-400"
                numberClassName="text-lg font-bold text-emerald-600 dark:text-emerald-400"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {tf('offerForQuantity', { n: approvedQty, unit })}
              </p>
              <button
                type="button"
                onClick={handlePurchase}
                className="btn-primary w-full py-1.5 text-xs font-bold"
              >
                {t('purchase')}
              </button>
            </div>
          ) : (
            <span className="flex w-full items-center justify-center rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {t('requestOfferCta')}
            </span>
          )}
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
