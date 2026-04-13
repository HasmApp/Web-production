import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart, ShoppingCart, TrendingDown, ChevronLeft, Bell, BellOff,
  Package, Truck, Shield, Star, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchProductById, createAlert, fetchAlerts, deleteAlert, resolveMediaUrl } from '../services/api.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import SarAmount from '../components/common/SarAmount.jsx';
import { formatProductCategory } from '../utils/formatProductCategory.js';
import { tamaraArUrl, tamaraEnUrl } from '../assets/branding.js';

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

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { lang, t, tf } = useLanguage();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [stockOption, setStockOption] = useState('full'); // 'quarter' | 'half' | 'full'
  const [isFav, setIsFav] = useState(false);
  const [alert, setAlert] = useState(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProductById(id);
        setProduct(data);
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
  const current = product.current_price ?? product.currentPrice ?? 0;
  const initial = product.initial_price ?? product.initialPrice ?? 0;
  const minimum = product.minimum_price ?? product.minimumPrice ?? 0;
  const progress = initial > minimum ? ((current - minimum) / (initial - minimum)) * 100 : 0;
  const supplierName = getSupplierDisplayName(product);

  // All products use stock options — no individual pieces allowed.
  const totalQty = product.quantity ?? product.stock ?? 0;
  const fromEndedAuction =
    product.from_ended_auction === true || product.from_ended_auction === 1;
  const sellFullOnly =
    product.sell_full_quantity_only === true || product.sell_full_quantity_only === 1;
  /** Same rule as product-service: post–auction full-stock shows quarter/half/full. */
  const relaxFullStockFlags = fromEndedAuction && sellFullOnly;
  const hasExplicitFlags =
    product.allow_quarter_quantity !== undefined ||
    product.allow_half_quantity !== undefined ||
    product.allow_full_quantity !== undefined;
  const stockOptions = [
    (relaxFullStockFlags || (hasExplicitFlags ? product.allow_quarter_quantity : true)) &&
      { key: 'quarter', label: t('quarter'), qty: product.quantity_quarter ?? Math.floor(totalQty / 4) },
    (relaxFullStockFlags || (hasExplicitFlags ? product.allow_half_quantity : true)) &&
      { key: 'half',    label: t('half'),    qty: product.quantity_half    ?? Math.floor(totalQty / 2) },
    (relaxFullStockFlags || (hasExplicitFlags ? product.allow_full_quantity !== false : true)) &&
      { key: 'full',    label: t('full'),    qty: product.quantity_full    ?? totalQty },
  ].filter(Boolean).filter((o) => o.qty > 0);

  // Default to last available option (Full preferred)
  const activeOption = stockOptions.find((o) => o.key === stockOption) ?? stockOptions[stockOptions.length - 1];
  const selectedQty = activeOption?.qty ?? 0;

  const toggleFav = () => {
    const favs = getFavorites();
    const newFavs = isFav ? favs.filter((x) => x !== product._id) : [...favs, product._id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
    setIsFav(!isFav);
    toast(isFav ? t('favRemovedToast') : t('favAddedToast'));
  };

  const handleAddToCart = () => {
    if (!activeOption) { toast.error(t('selectStockToast')); return; }
    addItem(product, selectedQty, activeOption.label);
    navigate('/checkout');
  };

  const handleSetAlert = async () => {
    if (!isAuthenticated) { toast.error(t('signInPriceAlerts')); return; }
    try {
      const created = await createAlert(product._id, parseFloat(alertPrice));
      setAlert(created);
      setShowAlertForm(false);
      toast.success(tf('alertSetToast', { amount: alertPrice }));
    } catch { toast.error(t('alertSetFailed')); }
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
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" /> {t('backToProducts')}
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
          {/* Title + category */}
          <div>
            <p className="text-sm font-semibold text-primary mb-1 leading-snug" dir="auto">
              {formatProductCategory(product.category, t)}
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
              {title}
            </h1>
            {supplierName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1" dir="auto">
                {tf('bySupplier', { name: supplierName })}
              </p>
            )}
          </div>

          {/* Price block */}
          <div className="card p-5 space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <SarAmount
                amount={current}
                iconSize={26}
                className="text-4xl font-extrabold text-primary items-end"
                numberClassName="text-4xl font-extrabold text-primary"
              />
            </div>
            {initial > current && (
              <p className="text-sm text-gray-400 line-through flex items-center gap-1 flex-wrap">
                <span>{t('was')}</span>
                <SarAmount amount={initial} iconSize={13} className="text-sm text-gray-400" numberClassName="text-gray-400" />
              </p>
            )}
            {/* Progress bar: how close to minimum */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-primary" />{t('current')}</span>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  <span>{t('floorPrice')}:</span>
                  <SarAmount amount={minimum} iconSize={11} className="text-xs text-gray-500 dark:text-gray-400" numberClassName="text-xs text-gray-500 dark:text-gray-400" />
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(2, progress)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 flex flex-wrap items-center gap-1">
                <span>{t('couldDrop')}</span>
                <SarAmount amount={Math.max(0, current - minimum)} iconSize={11} className="text-xs text-gray-400" numberClassName="text-xs text-gray-400" />
                <span>{t('more')}</span>
              </p>
            </div>
          </div>

          {/* Stock option selector — always required, no individual pieces */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('selectStockOption')}</label>
            {stockOptions.length > 0 ? (
              <>
                <div className="flex gap-3">
                  {stockOptions.map(({ key, label, qty }) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setStockOption(key)}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        (activeOption?.key === key)
                          ? 'border-primary bg-primary-50 dark:bg-primary-900/20 text-primary'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <div>{label}</div>
                      <div className="text-xs font-normal mt-0.5 opacity-70">{tf('qtyShort', { n: qty })}</div>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2 flex flex-wrap items-center gap-1">
                  <span>{t('totalLine')}</span>
                  <strong className="text-gray-900 dark:text-white inline-flex items-center">
                    <SarAmount amount={current * selectedQty} iconSize={14} className="text-gray-900 dark:text-white" numberClassName="font-bold text-gray-900 dark:text-white" />
                  </strong>
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">{t('stockOptionsUnavailable')}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={handleAddToCart} className="btn-primary flex-1 py-3 text-base">
              <ShoppingCart className="w-4 h-4" /> {t('addToCart')}
            </button>
            <button
              type="button"
              onClick={toggleFav}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                isFav
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-500'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-red-300 hover:text-red-400'
              }`}
            >
              <Heart className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Tamara ad */}
          <div className="card p-4" dir="ltr">
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 ${lang === 'ar' ? 'order-last' : ''}`}>
                <img
                  src={lang === 'ar' ? tamaraArUrl : tamaraEnUrl}
                  alt="Tamara"
                  className="h-9 w-auto object-contain rounded-lg"
                />
              </div>
              <div className="hidden w-px h-8 bg-gray-200 dark:bg-gray-700 flex-shrink-0 sm:block" />
              <div className={`flex-1 min-w-0 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('tamaraAdHeadline')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('tamaraAdSub')}</p>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-[#f8e9ff] dark:bg-purple-900/30 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 ${lang === 'ar' ? 'order-first' : ''}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                {t('tamaraAdBadge')}
              </span>
            </div>
          </div>

          {/* Price alert */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Bell className="w-4 h-4 text-primary" />
                {t('priceAlert')}
              </div>
              {alert ? (
                <button type="button" onClick={handleRemoveAlert} className="flex items-center gap-1 text-xs text-red-500 hover:underline flex-wrap">
                  <BellOff className="w-3.5 h-3.5 shrink-0" />
                  <span className="inline-flex items-center gap-0.5 flex-wrap">
                    {t('removeAlertShort')} (<SarAmount amount={alert.target_price} iconSize={11} />)
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) { toast.error(t('signInAlertsShort')); return; }
                    setShowAlertForm(!showAlertForm);
                  }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  {t('setAlert')}
                </button>
              )}
            </div>
            {showAlertForm && (
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder={t('alertPlaceholder')}
                  className="input flex-1 py-2 text-sm"
                  min="0"
                  max={current}
                />
                <button type="button" onClick={handleSetAlert} disabled={!alertPrice} className="btn-primary py-2 px-3 text-sm">
                  {t('setButton')}
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">{t('alertHint')}</p>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Truck, label: t('fastDelivery') },
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

      {/* Description */}
      {desc && (
        <div className="mt-12">
          <h2 className="section-title mb-4">{t('productDesc')}</h2>
          <div className="card p-6">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm whitespace-pre-line">{desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
