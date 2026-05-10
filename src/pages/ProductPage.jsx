import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart, ShoppingCart, ChevronLeft, ChevronDown, Bell, Tag, X,
  Package, Truck, Shield, Star, TrendingUp, Warehouse,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchProductById,
  createAlert,
  updateAlert,
  fetchAlerts,
  deleteAlert,
  resolveMediaUrl,
  createPriceRequest,
  createSampleRequest,
} from '../services/api.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import SarAmount from '../components/common/SarAmount.jsx';
import { formatProductCategory } from '../utils/formatProductCategory.js';
import { tamaraArUrl, tamaraEnUrl } from '../assets/branding.js';
import { isPickupOnlyProduct } from '../utils/productFlags.js';
import PickupOnlyBadge from '../components/common/PickupOnlyBadge.jsx';

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
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { lang, t, tf } = useLanguage();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [stockOption, setStockOption] = useState('quarter'); // 'quarter' | 'half' | 'full'
  const [isFav, setIsFav] = useState(false);
  const [alert, setAlert] = useState(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showPriceRequestModal, setShowPriceRequestModal] = useState(false);
  const [reqQuantity, setReqQuantity] = useState('1');
  const [reqPrice, setReqPrice] = useState('');
  const [reqMessage, setReqMessage] = useState('');
  const [showSampleRequestModal, setShowSampleRequestModal] = useState(false);
  const [sampleReqMessage, setSampleReqMessage] = useState('');
  /** Unit price frozen when you open this page (from home/card). Same idea as mobile `ProductPage` `_currentPrice`. */
  const [lockedPrice, setLockedPrice] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  useEffect(() => {
    setLockedPrice(null);
    setStockOption('quarter');
  }, [id]);

  const stockOptions = useMemo(() => {
    if (!product) return [];
    const totalQty = product.quantity ?? product.stock ?? 0;
    const fromEndedAuction =
      product.from_ended_auction === true || product.from_ended_auction === 1;
    const bundleFullLotOnly =
      product.bundle_full_lot_only === true || product.bundle_full_lot_only === 1;
    const sellFullOnly =
      product.sell_full_quantity_only === true || product.sell_full_quantity_only === 1;
    /* Post-auction singles: relax allow_* so quarter/half/full show. Bundles stay full-lot-only. */
    const relaxFullStockFlags = fromEndedAuction && !bundleFullLotOnly;
    const hasExplicitFlags =
      product.allow_quarter_quantity !== undefined ||
      product.allow_half_quantity !== undefined ||
      product.allow_full_quantity !== undefined;
    return [
      (relaxFullStockFlags || (hasExplicitFlags ? product.allow_quarter_quantity : true)) &&
        { key: 'quarter', label: t('quarter'), qty: product.quantity_quarter ?? Math.floor(totalQty / 4) },
      (relaxFullStockFlags || (hasExplicitFlags ? product.allow_half_quantity : true)) &&
        { key: 'half', label: t('half'), qty: product.quantity_half ?? Math.floor(totalQty / 2) },
      (relaxFullStockFlags || (hasExplicitFlags ? product.allow_full_quantity !== false : true)) &&
        { key: 'full', label: t('full'), qty: product.quantity_full ?? totalQty },
    ]
      .filter(Boolean)
      .filter((o) => o.qty > 0);
  }, [product, t]);

  useEffect(() => {
    if (stockOptions.length !== 1) return;
    const only = stockOptions[0].key;
    setStockOption((prev) => (prev === only ? prev : only));
  }, [id, stockOptions]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProductById(id);
        setProduct(data);
        const snap = Number(data.current_price ?? data.currentPrice ?? 0);
        setLockedPrice(Number.isFinite(snap) ? snap : 0);
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
  const pickupOnly = isPickupOnlyProduct(product);

  // Default selection is quarter when multiple options exist (see useState / id effect); fall back if unavailable
  const activeOption = stockOptions.find((o) => o.key === stockOption) ?? stockOptions[stockOptions.length - 1];
  const selectedQty = activeOption?.qty ?? 0;
  const sellFullOnly =
    product.sell_full_quantity_only === true || product.sell_full_quantity_only === 1;
  const fromEndedAuction =
    product.from_ended_auction === true || product.from_ended_auction === 1;
  /** Package / full-lot listing: only the full tier (including bundle after auction once API flags are correct). */
  const isBundlePackageProduct =
    sellFullOnly &&
    stockOptions.length === 1 &&
    stockOptions[0]?.key === 'full';
  const msrpUnit = Number(product.msrp ?? product.MSRP);
  const expectedProfitDiff =
    Number.isFinite(msrpUnit) &&
    msrpUnit > current &&
    Number.isFinite(selectedQty) &&
    selectedQty > 0
      ? (msrpUnit - current) * selectedQty
      : null;

  const toggleFav = () => {
    const favs = getFavorites();
    const newFavs = isFav ? favs.filter((x) => x !== product._id) : [...favs, product._id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
    setIsFav(!isFav);
    toast(isFav ? t('favRemovedToast') : t('favAddedToast'));
  };

  const handleAddToCart = () => {
    if (!activeOption) { toast.error(t('selectStockToast')); return; }
    addItem(
      { ...product, current_price: current, currentPrice: current },
      selectedQty,
      activeOption.label
    );
    navigate('/checkout');
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

  const handleSendPriceRequest = async () => {
    if (!isAuthenticated) {
      toast.error(t('loginPriceRequest'));
      return;
    }
    const sellerId = product.owner_id || product.owner?.id;
    if (!sellerId) {
      toast.error(t('priceRequestUnavailable'));
      return;
    }
    const quantity = Number(reqQuantity);
    const offeredRaw = Number(reqPrice);
    const offeredCents = Math.round(offeredRaw * 100);
    const offered = offeredCents / 100;
    if (
      !Number.isFinite(quantity) || quantity <= 0
      || !Number.isFinite(offeredRaw) || !Number.isFinite(offered) || offered <= 0
    ) {
      toast.error(t('invalidPriceRequestValues'));
      return;
    }
    try {
      const created = await createPriceRequest({
        product_id: product._id || product.id,
        seller_id: String(sellerId),
        quantity,
        offered_price: offered,
        message: reqMessage.trim() || undefined,
      });
      const status = String(created?.status || '').toLowerCase();
      setShowPriceRequestModal(false);
      setReqQuantity('1');
      setReqPrice('');
      setReqMessage('');
      if (status === 'approved') {
        const note = String(created?.decision_note || '').toLowerCase();
        const showOfferApprovedOnCheckout = note.includes('auto-approved');
        const unitPrice = Number(created?.offered_price ?? offered);
        const patched = {
          ...product,
          current_price: unitPrice,
          currentPrice: unitPrice,
          initial_price: unitPrice,
          initialPrice: unitPrice,
        };
        addItem(
          patched,
          quantity > 0 ? quantity : 1,
          activeOption?.label || 'Full',
        );
        // Match mobile PaymentPage(showOfferApprovedMessage): toast once on checkout, not before navigate.
        navigate('/checkout', {
          state: showOfferApprovedOnCheckout ? { showOfferApprovedMessage: true } : {},
        });
      } else {
        toast.success(t('priceRequestSent'));
      }
    } catch {
      toast.error(t('priceRequestFailed'));
    }
  };

  const handleSendSampleRequest = async () => {
    if (!isAuthenticated) {
      toast.error(t('loginSampleRequest'));
      return;
    }
    const sellerId = product.owner_id || product.owner?.id;
    if (!sellerId) {
      toast.error(t('priceRequestUnavailable'));
      return;
    }
    try {
      await createSampleRequest({
        product_id: product._id || product.id,
        seller_id: String(sellerId),
        message: sampleReqMessage.trim() || undefined,
      });
      setShowSampleRequestModal(false);
      setSampleReqMessage('');
      toast.success(t('sampleRequestSent'));
    } catch {
      toast.error(t('sampleRequestFailed'));
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
          <div className="card p-5 space-y-4 text-start">
            {isBundlePackageProduct && selectedQty > 0 ? (
              <span
                className="inline-flex min-h-[2.25rem] min-w-[2.5rem] items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-900 shadow-sm tabular-nums dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:shadow-none"
                dir="auto"
              >
                <Package className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
                {tf('packageDealQuantity', { quantity: selectedQty })}
              </span>
            ) : null}
            {/* No dir=ltr on wrapper: SarAmount isolates bidi; justify-start follows RTL so the price sits on the logical start (right in Arabic). */}
            <div className="flex w-full justify-start items-baseline gap-3 flex-wrap">
              <SarAmount
                amount={current}
                iconSize={26}
                className="text-4xl font-extrabold text-primary items-baseline"
                numberClassName="text-4xl font-extrabold text-primary"
              />
            </div>
            {initial > current && (
              <p className="text-sm text-gray-400 line-through flex w-full justify-start items-baseline gap-1 flex-wrap">
                <span>{t('was')}</span>
                <SarAmount amount={initial} iconSize={13} className="text-sm text-gray-400" numberClassName="text-gray-400" />
              </p>
            )}
            {expectedProfitDiff != null && (
              <div className="flex w-full justify-start">
                <div
                  className="flex max-w-full flex-wrap items-baseline gap-1.5 text-start text-sm font-extrabold leading-snug text-emerald-600 dark:text-emerald-400"
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                >
                  <TrendingUp className="h-4 w-4 shrink-0 self-center text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden />
                  <span className="min-w-0 shrink" dir="auto">
                    {t('expectedProfitDiff')}
                    {' : '}
                  </span>
                  <SarAmount
                    amount={expectedProfitDiff}
                    iconSize={14}
                    prefix="+"
                    className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400"
                    numberClassName="text-sm font-extrabold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>
            )}
            {pickupOnly ? (
              <div className="pt-1">
                <PickupOnlyBadge size="md" />
              </div>
            ) : null}
          </div>

          {/* Stock option selector — hidden when only full quantity (e.g. package products) */}
          <div>
            {stockOptions.length > 1 ? (
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('selectStockOption')}</label>
            ) : null}
            {stockOptions.length > 0 ? (
              <>
                {stockOptions.length > 1 ? (
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
                ) : null}
                <p
                  className={`text-sm text-gray-500 flex flex-wrap items-center gap-1 ${stockOptions.length > 1 ? 'mt-2' : ''}`}
                  dir="auto"
                >
                  <span>{t('totalLine')}</span>
                  <strong className="text-gray-900 dark:text-white inline-flex items-center" dir="ltr">
                    <SarAmount amount={current * selectedQty} iconSize={14} className="text-gray-900 dark:text-white" numberClassName="font-bold text-gray-900 dark:text-white" />
                  </strong>
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">{t('stockOptionsUnavailable')}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <button type="button" onClick={handleAddToCart} className="btn-primary flex-1 py-2.5 text-sm">
              <ShoppingCart className="w-4 h-4 shrink-0" /> {t('addToCart')}
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

          {/* Price alert + request: request first in DOM — left in EN (LTR), right in AR (RTL) */}
          <div className="card p-3 space-y-1.5">
            <div className="flex gap-2 items-stretch" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error(t('loginPriceRequest'));
                    return;
                  }
                  setReqQuantity('1');
                  setReqPrice(Number(current).toFixed(2));
                  setReqMessage('');
                  setShowPriceRequestModal(true);
                }}
                className="flex-1 min-h-0 rounded-xl px-1 py-1.5 bg-primary text-white shadow-sm transition-opacity hover:opacity-95"
              >
                <span className="flex flex-col items-center justify-center gap-0.5">
                  <Tag className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="text-center text-[10px] font-semibold leading-tight text-white">
                    {t('requestOfferCta')}
                  </span>
                </span>
              </button>
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
                className={`flex-1 min-h-0 rounded-xl px-1 py-1.5 border-2 bg-white shadow-sm transition-colors dark:bg-gray-800/60 ${
                  alert
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                    : 'border-primary/55 text-primary dark:text-gray-100'
                }`}
              >
                <span className="flex flex-col items-center justify-center gap-0.5">
                  <Bell className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="text-center text-[10px] font-semibold leading-tight">
                    {alert ? t('updateAlert') : t('setAlert')}
                  </span>
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error(t('loginSampleRequest'));
                  return;
                }
                const sellerId = product.owner_id || product.owner?.id;
                if (!sellerId) {
                  toast.error(t('priceRequestUnavailable'));
                  return;
                }
                setSampleReqMessage('');
                setShowSampleRequestModal(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/55 bg-white py-2.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <Package className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t('sampleRequestCta')}
            </button>
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

      {showPriceRequestModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPriceRequestModal(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="price-req-modal-title"
            className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="price-req-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {t('requestPriceFromSeller')}
              </h3>
              <button
                type="button"
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setShowPriceRequestModal(false)}
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
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="pr-qty" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('quantity')}
                </label>
                <input
                  id="pr-qty"
                  type="number"
                  min="1"
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(e.target.value)}
                  className="input mt-1 w-full py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="pr-price" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('offeredPrice')}
                </label>
                <input
                  id="pr-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={reqPrice}
                  onChange={(e) => setReqPrice(sanitizeOfferedPriceInput(e.target.value))}
                  className="input mt-1 w-full py-2 text-sm"
                />
              </div>
            </div>
            <label htmlFor="pr-msg" className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('messageOptional')}
            </label>
            <textarea
              id="pr-msg"
              value={reqMessage}
              onChange={(e) => setReqMessage(e.target.value)}
              className="input mt-1 min-h-[80px] w-full py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                onClick={() => setShowPriceRequestModal(false)}
              >
                {t('cancel')}
              </button>
              <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={handleSendPriceRequest}>
                {t('sendRequest')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSampleRequestModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowSampleRequestModal(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sample-req-modal-title"
            className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <Package className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
                <h3 id="sample-req-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('sampleRequestDialogTitle')}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setShowSampleRequestModal(false)}
                aria-label={t('cancel')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-800 dark:text-gray-200" dir="auto">
              {title}
            </p>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400" dir="auto">
              {t('sampleRequestDialogBody')}
            </p>
            <label htmlFor="sample-req-msg" className="mt-4 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('messageOptional')}
            </label>
            <textarea
              id="sample-req-msg"
              value={sampleReqMessage}
              onChange={(e) => setSampleReqMessage(e.target.value)}
              className="input mt-1 min-h-[80px] w-full py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                onClick={() => setShowSampleRequestModal(false)}
              >
                {t('cancel')}
              </button>
              <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={handleSendSampleRequest}>
                {t('sendRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
