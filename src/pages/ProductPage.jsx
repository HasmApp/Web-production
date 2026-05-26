import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart, ShoppingCart, ChevronLeft, ChevronDown, Bell, X,
  Package, Truck, Shield, Star, Minus, Plus, Warehouse, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchProductById,
  createAlert,
  updateAlert,
  fetchAlerts,
  deleteAlert,
  resolveMediaUrl,
} from '../services/api.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { savePendingCheckoutGroup } from '../utils/supplierCart.js';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import SarAmount from '../components/common/SarAmount.jsx';
import { formatProductCategory } from '../utils/formatProductCategory.js';
import { tamaraArUrl, tamaraEnUrl } from '../assets/branding.js';
import { isPickupOnlyProduct, isBundlePackageProduct } from '../utils/productFlags.js';
import { maxSelectableQuantity } from '../utils/cartQuantityLimits.js';
import {
  defaultSizeOption,
  hasSizeQuantities,
  sizeOptions,
  stockForSize,
} from '../utils/sizeQuantities.js';
import PickupOnlyBadge from '../components/common/PickupOnlyBadge.jsx';
import {
  formatFoodProductDate,
  getProductExpiryDate,
} from '../utils/foodProductDisplay.js';

const FAVORITES_KEY = 'hasm_favorites';
const getFavorites = () => {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; }
};

/** API exposes supplier as `owner` (name / company_name); keep legacy keys if present. */
const getSupplierDisplayName = (p) => {
  if (!p) return '';
  const direct = p.supplier_name ?? p.supplierName ?? p.supplier?.name;
  if (direct != null && String(direct).trim()) return String(direct).trim();
  const owner = p.owner;
  if (!owner || typeof owner !== 'object') return '';
  const company = owner.company_name ?? owner.companyName;
  if (company != null && String(company).trim()) return String(company).trim();
  const name = owner.name ?? owner.user_name;
  if (name != null && String(name).trim()) return String(name).trim();
  return '';
};

/** At most two fraction digits, matching DB NUMERIC(10,2) / cent precision. */
const sanitizeOfferedPriceInput = (raw) => {
  const text = String(raw ?? '').replace(/[^\d.]/g, '');
  if (text === '') return '';
  const parts = text.split('.');
  if (parts.length > 2) {
    const before = (parts[0] ?? '').slice(0, 12);
    const after = parts.slice(1).join('').slice(0, 2);
    return after ? `${before}.${after}` : `${before}.`;
  }
  let before = parts[0] ?? '';
  let after = parts.length > 1 ? parts[1] : '';
  if (before.length > 12) before = before.slice(0, 12);
  if (after.length > 2) after = after.slice(0, 2);
  if (parts.length > 1 && after === '') return `${before}.`;
  if (after === '') return before;
  return `${before}.${after}`;
};

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { purchaseForCheckout } = useCart();
  const { isAuthenticated } = useAuth();
  const { lang, t, tf } = useLanguage();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const [alert, setAlert] = useState(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  /** Unit price frozen when you open this page (from home/card). Same idea as mobile `ProductPage` `_currentPrice`. */
  const [lockedPrice, setLockedPrice] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  useEffect(() => {
    setLockedPrice(null);
    setSelectedQuantity(1);
    setSelectedSize(null);
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProductById(id);
        if (!data) {
          toast.error(t('productNotFound'));
          navigate('/');
          return;
        }
        if (isBundlePackageProduct(data)) {
          toast.error(t('productNotFound'));
          navigate('/');
          return;
        }
        setProduct(data);
        const snap = Number(data.current_price ?? data.currentPrice ?? 0);
        setLockedPrice(Number.isFinite(snap) ? snap : 0);
        const initialSize = hasSizeQuantities(data) ? defaultSizeOption(data) : null;
        setSelectedSize(initialSize);
        const maxQty = maxSelectableQuantity(data, initialSize);
        setSelectedQuantity((q) => {
          if (maxQty <= 0) return 1;
          return Math.min(Math.max(1, q), maxQty);
        });
        const favs = getFavorites();
        setIsFav(favs.includes(data._id));
        if (isAuthenticated) {
          const alerts = await fetchAlerts();
          const existing = alerts.find((a) => a.product_id === data._id);
          if (existing) setAlert(existing);
        }
      } catch {
        toast.error(t('productNotFound'));
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isAuthenticated, navigate]);

  if (loading) return <PageLoader />;
  if (!product) return null;

  const rawImages = product.images?.length ? product.images : [product.image].filter(Boolean);
  const images = rawImages.map((u) => resolveMediaUrl(u)).filter(Boolean);
  const title =
    lang === 'ar'
      ? (product.title_ar || product.titleAr || product.title || '')
      : (product.title_en || product.titleEn || product.title || '');
  const desc =
    lang === 'ar'
      ? (product.description_ar || product.descriptionAr || product.description || '')
      : (product.description_en || product.descriptionEn || product.description || '');
  const current =
    lockedPrice != null
      ? lockedPrice
      : (product.current_price ?? product.currentPrice ?? 0);
  const initial = product.initial_price ?? product.initialPrice ?? 0;
  const supplierName = getSupplierDisplayName(product);
  const expiryDate = getProductExpiryDate(product);
  const pickupOnly = isPickupOnlyProduct(product);
  const sizeChoices = sizeOptions(product);
  const usesSizes = sizeChoices.length > 0;
  const maxQty = maxSelectableQuantity(product, selectedSize);
  const stepperMax = maxQty > 0 ? maxQty : 1;
  const totalLinePrice = current * selectedQuantity;

  const toggleFav = () => {
    const favs = getFavorites();
    const newFavs = isFav ? favs.filter((x) => x !== product._id) : [...favs, product._id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
    setIsFav(!isFav);
    toast(isFav ? t('favRemovedToast') : t('favAddedToast'));
  };

  const handlePurchase = () => {
    const stock = stockForSize(product, selectedSize);
    if (stock < 1) return;
    if (usesSizes && !selectedSize) {
      toast.error(t('selectSizeRequired'));
      return;
    }
    let qty = selectedQuantity;
    if (maxQty > 0 && qty > maxQty) qty = maxQty;
    if (qty < 1) qty = 1;
    const patched = { ...product, current_price: current, currentPrice: current };
    const groupKey = purchaseForCheckout(patched, qty, 'Full', selectedSize);
    savePendingCheckoutGroup(groupKey);
    if (!isAuthenticated) {
      toast.error(t('loginToCheckout'));
      navigate('/login', {
        replace: true,
        state: {
          from: {
            pathname: '/checkout',
            state: { checkoutGroupKey: groupKey },
          },
        },
      });
      return;
    }
    navigate('/checkout', { replace: true, state: { checkoutGroupKey: groupKey } });
  };

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    const nextMax = maxSelectableQuantity(product, size);
    setSelectedQuantity((q) => {
      if (nextMax <= 0) return 1;
      return Math.min(Math.max(1, q), nextMax);
    });
  };

  const handleSetAlert = async () => {
    if (!isAuthenticated) { toast.error(t('loginPriceAlerts')); return; }
    const targetPrice = parseFloat(alertPrice);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      toast.error(t('pleaseEnterValidPrice'));
      return;
    }
    if (targetPrice >= current) {
      toast.error(t('targetPriceMustBeLower'));
      return;
    }
    try {
      if (alert) {
        const updated = await updateAlert(alert.id || alert._id, targetPrice);
        setAlert(updated);
      } else {
        const created = await createAlert(product._id, targetPrice);
        setAlert(created);
      }
      setShowAlertModal(false);
      toast.success(tf('alertSetToast', { amount: alertPrice }));
    } catch {
      toast.error(t('alertSetFailed'));
    }
  };



  const handleRemoveAlert = async () => {
    try {
      await deleteAlert(alert.id || alert._id);
      setAlert(null);
      toast.success(t('alertRemovedToast2'));
    } catch { toast.error(t('alertRemoveFailedToast')); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-primary rtl:flex-row-reverse"
      >
        <ChevronLeft className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
        <span>{t('backToProducts')}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-3 sm:p-5">
            {images[selectedImg] ? (
              <img
                src={images[selectedImg]}
                alt={title}
                className="max-h-full max-w-full w-auto h-auto object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Package className="w-20 h-20" strokeWidth={1} />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors flex items-center justify-center bg-gray-50 dark:bg-gray-800 ${
                    selectedImg === i ? 'border-primary' : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <img src={img} alt="" className="max-h-full max-w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Title + category (favorite on same row as category) */}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-primary" dir="auto">
                {formatProductCategory(product.category, t)}
              </p>
              <button
                type="button"
                onClick={toggleFav}
                aria-label={isFav ? t('removeFromFavorites') : t('addToFavorites')}
                title={isFav ? t('removeFromFavorites') : t('addToFavorites')}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                  isFav
                    ? 'border-red-500 bg-red-50 text-red-500 dark:bg-red-900/30'
                    : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 dark:border-gray-600 dark:text-gray-400'
                }`}
              >
                <Heart className="h-5 w-5" fill={isFav ? 'currentColor' : 'none'} aria-hidden />
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
              {title}
            </h1>
            {supplierName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1" dir="auto">
                {tf('bySupplier', { name: supplierName })}
              </p>
            )}
            {expiryDate ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span dir="auto">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {t('productExpiryDate')}:
                  </span>{' '}
                  {formatFoodProductDate(expiryDate, lang)}
                </span>
              </p>
            ) : null}
          </div>

          {/* Price + purchase bar — matches mobile ProductPage (quantity stepper, purchase, alert only). */}
          <div className="card p-4 space-y-4 text-start">
            <div className="flex w-full justify-start items-baseline gap-3 flex-wrap">
              <SarAmount
                amount={current}
                iconSize={26}
                className="text-4xl font-extrabold text-primary items-baseline"
                numberClassName="text-4xl font-extrabold text-primary"
              />
            </div>
            {initial > current ? (
              <p className="text-sm text-gray-400 line-through flex w-full justify-start items-baseline gap-1 flex-wrap">
                <span>{t('was')}</span>
                <SarAmount amount={initial} iconSize={13} className="text-sm text-gray-400" numberClassName="text-gray-400" />
              </p>
            ) : null}
            {pickupOnly ? (
              <div className="pt-1">
                <PickupOnlyBadge size="md" />
              </div>
            ) : null}

            {usesSizes ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('selectSize')}</p>
                <div className="flex flex-wrap gap-2">
                  {sizeChoices.map((size) => {
                    const available = stockForSize(product, size);
                    const active = selectedSize === size;
                    const disabled = available <= 0;
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSizeChange(size)}
                        className={`inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                          disabled
                            ? 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400 opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-600'
                            : active
                              ? 'bg-primary text-white shadow-sm'
                              : 'border border-gray-200 bg-white text-gray-700 hover:border-primary/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <div className="min-w-0 flex-1 basis-[6.5rem]">
                <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">
                  {tf('totalPriceForPieces', { quantity: selectedQuantity })}
                </p>
                <SarAmount
                  amount={totalLinePrice}
                  iconSize={16}
                  className="text-base font-bold text-gray-900 dark:text-white"
                  numberClassName="text-base font-bold text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-1.5 py-1 dark:border-gray-700 dark:bg-gray-800/80">
                <button
                  type="button"
                  disabled={selectedQuantity <= 1 || maxQty <= 0}
                  onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                  className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
                  aria-label={t('decreaseQuantity')}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                  {selectedQuantity}
                </span>
                <button
                  type="button"
                  disabled={selectedQuantity >= stepperMax || maxQty <= 0}
                  onClick={() => setSelectedQuantity((q) => Math.min(stepperMax, q + 1))}
                  className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
                  aria-label={t('increaseQuantity')}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                disabled={(product.quantity ?? product.stock ?? 0) < 1}
                onClick={handlePurchase}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-gray-950"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
                {t('purchase')}
              </button>
            </div>
          </div>

          {/* Tamara ad */}
          <div className="card p-4" dir="ltr">
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 ${lang === 'ar' ? 'order-last' : ''}`}>
                <img
                  src={lang === 'ar' ? tamaraArUrl : tamaraEnUrl}
                  alt="Tamara"
                  className="h-12 sm:h-14 w-auto object-contain rounded-xl"
                />
              </div>
              <div
                className={`hidden sm:block w-px h-12 bg-gray-200 dark:bg-gray-700 flex-shrink-0 ${
                  lang === 'ar' ? 'sm:order-3' : 'sm:order-2'
                }`}
              />
              <div
                className={`flex-1 min-w-0 text-center ${
                  lang === 'ar' ? 'sm:order-2 sm:text-right' : 'sm:order-3 sm:text-left'
                }`}
              >
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

          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                toast.error(t('loginAlertsShort'));
                return;
              }
              setAlertPrice(alert ? String(alert.target_price ?? '') : '');
              setShowAlertModal(true);
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-1 py-2 text-start text-sm font-medium transition-colors ${
              alert
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Bell className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className="flex-1">{alert ? t('updateAlert') : t('setAlert')}</span>
            <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 rtl:rotate-90 opacity-60" aria-hidden />
          </button>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              pickupOnly
                ? { icon: Warehouse, label: t('badgePickupOnly') }
                : { icon: Truck, label: t('fastDelivery') },
              { icon: Shield, label: t('securePayment') },
              { icon: Star, label: t('qualityProducts') },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Description — open by default (native details/summary) */}
      {desc && (
        <div className="mt-12">
          <details open className="card overflow-hidden group">
            <summary className="section-title mb-0 cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>{t('productDesc')}</span>
              <ChevronDown className="w-5 h-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180 dark:text-gray-400" />
            </summary>
            <div className="border-t border-gray-100 dark:border-gray-700 px-5 pb-5 pt-3">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm whitespace-pre-line">{desc}</p>
            </div>
          </details>
        </div>
      )}

      {showAlertModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAlertModal(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-modal-title"
            className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="alert-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {alert ? t('updateTargetPriceTitle') : t('setTargetPriceTitle')}
              </h3>
              <button
                type="button"
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setShowAlertModal(false)}
                aria-label={t('cancel')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-800 dark:text-gray-200" dir="auto">
              {title}
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-2 text-sm">
              <span className="font-medium text-primary">{t('currentPriceLabel')}</span>
              <SarAmount
                amount={current}
                iconSize={14}
                className="font-semibold text-primary"
                numberClassName="font-semibold text-primary"
              />
            </div>
            <label htmlFor="alert-target-input" className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('enterTargetPriceLabel')}
            </label>
            <input
              id="alert-target-input"
              type="number"
              value={alertPrice}
              onChange={(e) => setAlertPrice(e.target.value)}
              placeholder={t('alertPlaceholder')}
              className="input mt-1 w-full py-2 text-sm"
              min="0"
              step="0.01"
            />
            <p className="mt-2 text-xs text-gray-400">{t('alertDescription')}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {alert ? (
                <button
                  type="button"
                  onClick={async () => {
                    await handleRemoveAlert();
                    setShowAlertModal(false);
                  }}
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  {t('removeAlertShort')}
                </button>
              ) : null}
              <div className="ms-auto flex gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                  onClick={() => setShowAlertModal(false)}
                >
                  {t('cancel')}
                </button>
                <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={handleSetAlert}>
                  {t('setButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
