import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, TrendingDown, ArrowRight, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../../services/api.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import SarAmount from '../common/SarAmount.jsx';
import { formatProductCategory } from '../../utils/formatProductCategory.js';

const FAVORITES_KEY = 'hasm_favorites';

const getFavorites = () => {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
  catch { return []; }
};

export default function ProductCard({ product }) {
  const { lang, t } = useLanguage();
  const [isFav, setIsFav] = useState(false);
  const [priceChanged, setPriceChanged] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(
    product.current_price ?? product.currentPrice ?? 0
  );

  useEffect(() => {
    const favs = getFavorites();
    setIsFav(favs.includes(product._id));
  }, [product._id]);

  // Animate price drop
  useEffect(() => {
    const newPrice = product.current_price ?? product.currentPrice ?? 0;
    if (newPrice !== displayPrice) {
      setPriceChanged(true);
      setDisplayPrice(newPrice);
      setTimeout(() => setPriceChanged(false), 600);
    }
  }, [product.current_price, product.currentPrice]);

  const toggleFav = (e) => {
    e.preventDefault();
    const favs = getFavorites();
    const newFavs = isFav
      ? favs.filter((id) => id !== product._id)
      : [...favs, product._id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
    setIsFav(!isFav);
    toast(isFav ? t('favRemovedToast') : t('favAddedToast'));
  };

  const initial = product.initial_price ?? product.initialPrice ?? 0;
  const current = displayPrice;
  const minimum = product.minimum_price ?? product.minimumPrice ?? 0;
  const image = resolveMediaUrl((product.images?.[0]) || product.image || '');
  const title =
    lang === 'ar'
      ? (product.title_ar || product.titleAr || product.title || '')
      : (product.title_en || product.titleEn || product.title || '');
  const categoryLabel = formatProductCategory(product.category || '', t);

  return (
    <Link
      to={`/product/${product._id}`}
      className="group card hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-700">
            <Package className="w-12 h-12" strokeWidth={1} />
          </div>
        )}
        {/* Favorite button */}
        <button
          type="button"
          onClick={toggleFav}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
            isFav
              ? 'bg-red-500 text-white'
              : 'bg-white/90 dark:bg-gray-800/90 text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {categoryLabel ? (
          <p className="text-xs text-primary font-semibold leading-snug" dir="auto">{categoryLabel}</p>
        ) : null}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {title}
        </h3>

        {/* Price */}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <SarAmount
                amount={current}
                iconSize={15}
                className={`text-lg font-bold text-primary transition-all duration-300 ${
                  priceChanged ? 'text-red-500 scale-110' : ''
                }`}
                numberClassName={`text-lg font-bold ${priceChanged ? 'text-red-500' : 'text-primary'}`}
              />
            </div>
            {initial > current && (
              <p className="text-xs text-gray-400 line-through">
                <SarAmount amount={initial} iconSize={11} className="text-xs text-gray-400" numberClassName="text-gray-400" />
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <TrendingDown className="w-3.5 h-3.5 shrink-0" />
            <span>{t('cardDroppingLabel')}</span>
          </div>
        </div>

        {/* Min price indicator */}
        {minimum > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-1">
            <div
              className="bg-primary rounded-full h-1.5 transition-all duration-700"
              style={{
                width: `${Math.max(5, Math.min(100, ((current - minimum) / (initial - minimum)) * 100))}%`,
              }}
            />
          </div>
        )}

        {/* View product — stock option selected on product page */}
        <div className="btn-primary w-full mt-2 text-xs py-2 flex items-center justify-center gap-1.5 pointer-events-none">
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          {t('viewProduct')}
        </div>
      </div>
    </Link>
  );
}
