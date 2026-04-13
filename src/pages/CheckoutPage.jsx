import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, CreditCard, CheckCircle, ArrowRight,
  Package, ChevronLeft, Clock, ChevronDown, Lock, ExternalLink, Search,
  Landmark, Upload, FileText, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  prepareTapCheckout, chargeWithToken, getTapCharge, completeAfter3DS,
  createTamaraOrder, confirmTamaraPayment,
  createOrderWithTransferProof,
  fetchRegions, fetchCities, fetchDistricts,
  resolveMediaUrl,
  fetchAppConfig,
} from '../services/api.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { tamaraArUrl, tamaraEnUrl } from '../assets/branding.js';
import SarAmount from '../components/common/SarAmount.jsx';
import { apiErrorMessage } from '../utils/apiErrorMessage.js';

const CHECKOUT_ADDRESS_STORAGE_KEY = 'hasm_web_checkout_address_v1';

function defaultCheckoutAddress() {
  return {
    region_id: '',
    region: '',
    city_id: '',
    city: '',
    district_id: '',
    district: '',
    street: '',
    home_number: '',
    short_address: '',
    notes: '',
  };
}

function loadSavedCheckoutAddress() {
  if (typeof window === 'undefined') return defaultCheckoutAddress();
  try {
    const raw = window.localStorage.getItem(CHECKOUT_ADDRESS_STORAGE_KEY);
    if (!raw) return defaultCheckoutAddress();
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return defaultCheckoutAddress();
    const merged = { ...defaultCheckoutAddress(), ...o };
    delete merged.label;
    return merged;
  } catch {
    return defaultCheckoutAddress();
  }
}

// ─── Address step ─────────────────────────────────────────────────────────────
function rowSearchBlob(row) {
  return [row?.name, row?.name_ar, row?.nameAr, row?.name_en, row?.nameEn].filter(Boolean).join(' ').toLowerCase();
}

/** Single field: closed state looks like the other inputs; search lives inside the open panel (not a second box). */
function SearchableLocationSelect({
  valueId,
  onSelect,
  options,
  getLabel,
  disabled,
  loading,
  loadingLabel,
  emptyLabel,
  searchPlaceholder,
  noMatchesLabel,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const tid = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {
      clearTimeout(tid);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => rowSearchBlob(o).includes(q));
  }, [options, query]);

  const selected = options.find((x) => String(x.id) === String(valueId));
  const displayText = selected ? getLabel(selected) : '';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => !disabled && !loading && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`input flex items-center justify-between gap-2 text-start min-h-[2.875rem] ${
          !displayText && !loading ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        <span className="truncate min-w-0 flex-1">{loading ? loadingLabel : displayText || emptyLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform pointer-events-none ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && !loading && (
        <div className="absolute z-40 mt-1 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl flex flex-col max-h-72 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-800/80">
            <Search className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent border-0 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0"
            />
          </div>
          <ul className="overflow-y-auto py-1 min-h-0 max-h-52" role="listbox">
            <li>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2.5 text-start text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/80"
                onClick={() => {
                  onSelect('', '');
                  setOpen(false);
                }}
              >
                {emptyLabel}
              </button>
            </li>
            {filtered.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  role="option"
                  className={`w-full px-3 py-2.5 text-start text-sm hover:bg-primary-50 dark:hover:bg-primary-900/25 ${
                    String(row.id) === String(valueId)
                      ? 'bg-primary-50 dark:bg-primary-900/30 font-medium text-primary'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                  onClick={() => {
                    onSelect(String(row.id), getLabel(row));
                    setOpen(false);
                  }}
                >
                  {getLabel(row)}
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && query.trim() && options.length > 0 && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
              {noMatchesLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AddressStep({ address, setAddress, onNext, canContinue }) {
  const { t, lang } = useLanguage();
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const displayRegion = (r) => (lang === 'ar' && (r.name_ar || r.nameAr) ? (r.name_ar || r.nameAr) : (r.name || r.name_en || ''));
  const displayCity = (c) => (lang === 'ar' && (c.name_ar || c.nameAr) ? (c.name_ar || c.nameAr) : (c.name || c.name_en || ''));
  const displayDistrict = (d) =>
    lang === 'ar' && (d.name_ar || d.nameAr) ? (d.name_ar || d.nameAr) : (d.name_en || d.name || '');

  useEffect(() => {
    fetchRegions().then(setRegions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!address.region_id) {
      setCities([]);
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    fetchCities(address.region_id)
      .then((list) => {
        if (!cancelled) setCities(list || []);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address.region_id]);

  useEffect(() => {
    if (!address.city_id) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    fetchDistricts(address.city_id)
      .then((list) => {
        if (!cancelled) setDistricts(list || []);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address.city_id]);

  const handleRegion = (regionId, regionName) => {
    setAddress((a) => ({
      ...a,
      region_id: regionId,
      region: regionName,
      city_id: '',
      city: '',
      district_id: '',
      district: '',
    }));
    setCities([]);
    setDistricts([]);
  };

  const handleCity = (cityId, cityName) => {
    setAddress((a) => ({
      ...a,
      city_id: cityId,
      city: cityName,
      district_id: '',
      district: '',
    }));
    setDistricts([]);
  };

  const handleDistrict = (districtId, districtName) => {
    setAddress((a) => ({ ...a, district_id: districtId, district: districtName }));
  };

  const nationalAddressValid = /^[A-Za-z]{4}\d{4}$/.test((address.short_address || '').trim());

  return (
    <div className="card p-6">
      <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-2 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" /> {t('shippingAddress')}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{t('shippingAllFieldsRequired')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Region */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('region')}</label>
          <SearchableLocationSelect
            valueId={address.region_id || ''}
            onSelect={(id, name) => handleRegion(id, name)}
            options={regions}
            getLabel={displayRegion}
            disabled={false}
            loading={false}
            loadingLabel={t('selectRegion')}
            emptyLabel={t('selectRegion')}
            searchPlaceholder={t('regionSearch')}
            noMatchesLabel={t('noLocationMatches')}
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('city')}</label>
          <SearchableLocationSelect
            valueId={address.city_id || ''}
            onSelect={(id, name) => handleCity(id, name)}
            options={cities}
            getLabel={displayCity}
            disabled={!address.region_id}
            loading={loadingCities}
            loadingLabel={t('loading')}
            emptyLabel={t('selectCity')}
            searchPlaceholder={t('citySearch')}
            noMatchesLabel={t('noLocationMatches')}
          />
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('district')}</label>
          <SearchableLocationSelect
            valueId={address.district_id || ''}
            onSelect={(id, name) => handleDistrict(id, name)}
            options={districts}
            getLabel={displayDistrict}
            disabled={!address.city_id}
            loading={loadingDistricts}
            loadingLabel={t('loading')}
            emptyLabel={t('selectDistrict')}
            searchPlaceholder={t('districtSearch')}
            noMatchesLabel={t('noLocationMatches')}
          />
        </div>

        {/* Street */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('street')}</label>
          <input
            type="text"
            required
            value={address.street || ''}
            onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
            placeholder={t('streetPlaceholder')}
            className="input"
          />
        </div>

        {/* Home number */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('buildingNo')}</label>
          <input
            type="text"
            required
            value={address.home_number || ''}
            onChange={(e) => setAddress((a) => ({ ...a, home_number: e.target.value }))}
            placeholder={t('buildingPlaceholder')}
            className="input"
          />
        </div>

        {/* Short address */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('nationalAddressCode')}</label>
          <input
            type="text"
            required
            value={address.short_address || ''}
            onChange={(e) => setAddress((a) => ({ ...a, short_address: e.target.value.toUpperCase() }))}
            placeholder={t('nationalAddressPlaceholder')}
            className={`input font-mono ${address.short_address && !nationalAddressValid ? 'border-red-400 focus:ring-red-400' : ''}`}
            maxLength={8}
            pattern="[A-Za-z]{4}[0-9]{4}"
            title={t('nationalAddressFormatHint')}
          />
          {address.short_address && !nationalAddressValid && (
            <p className="text-xs text-red-500 mt-1">{t('nationalAddressFormatHint')}</p>
          )}
        </div>

      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="btn-primary mt-6 py-3 px-6"
      >
        {t('continueToPayment')} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}


// ─── Main checkout ─────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { t, tf, lang } = useLanguage();

  const STEPS = useMemo(() => [t('address'), t('payment'), t('done')], [lang, t]);
  const PAYMENT_METHODS = useMemo(
    () => [
      { id: 'card',          label: t('paymentCardTitle'),     icon: CreditCard, desc: t('visaMada') },
      { id: 'bank_transfer', label: t('bankTransferTitle'),    icon: Landmark,   desc: t('bankTransferDesc') },
      { id: 'tamara',        label: t('paymentTamaraTitle'),   icon: null,       logo: lang === 'ar' ? tamaraArUrl : tamaraEnUrl, desc: t('tamaraSplit') },
    ],
    [lang, t]
  );

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [transferProof, setTransferProof] = useState(null); // File object for bank transfer
  /** After prepare Tap / Tamara create — mirrors server `delivery_fee`; null = use client estimate. */
  const [confirmedDeliveryFee, setConfirmedDeliveryFee] = useState(null);
  const [configDeliveryPrice, setConfigDeliveryPrice] = useState(0);

  const [address, setAddress] = useState(() => loadSavedCheckoutAddress());

  useEffect(() => {
    try {
      const payload = { ...address };
      delete payload.label;
      window.localStorage.setItem(CHECKOUT_ADDRESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
  }, [address]);

  // Redirect to cart if empty — must be in useEffect, not during render
  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items.length, navigate]);

  const pollCharge = useCallback(
    (chargeId, orderId) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts += 1;
        try {
          const status = await getTapCharge(chargeId);
          if (status.status === 'CAPTURED') {
            clearInterval(interval);
            await completeAfter3DS({ charge_id: chargeId, order_id: orderId });
            clearCart();
            setStep(2);
          } else if (['FAILED', 'CANCELLED', 'DECLINED'].includes(status.status)) {
            clearInterval(interval);
            toast.error(t('paymentNotCompleted'));
          } else if (attempts >= 20) {
            clearInterval(interval);
            toast.error(t('paymentTimeout'));
          }
        } catch {}
      }, 4000);
    },
    [t, clearCart]
  );

  const cartKey = useMemo(
    () => (items.length === 0 ? '' : items.map((i) => `${i.product._id || i.product.id}:${i.quantity}`).join('|')),
    [items]
  );

  const orderItems = useMemo(
    () =>
      items.map((i) => ({
        product_id: i.product._id || i.product.id,
        quantity: i.quantity,
        price: i.price,
      })),
    [items]
  );

  const shippingAddressStr = useMemo(
    () =>
      [address.region, address.city, address.district, address.street, address.home_number]
        .map((s) => (typeof s === 'string' ? s.trim() : s))
        .filter(Boolean)
        .join(', '),
    [address.region, address.city, address.district, address.street, address.home_number]
  );

  const nationalAddressOk = useMemo(
    () => /^[A-Za-z]{4}\d{4}$/.test((address.short_address || '').trim()),
    [address.short_address]
  );

  const addressFormComplete = useMemo(
    () =>
      Boolean(
        address.region_id &&
          address.city_id &&
          address.district_id &&
          (address.street || '').trim() &&
          (address.home_number || '').trim() &&
          nationalAddressOk
      ),
    [
      address.region_id,
      address.city_id,
      address.district_id,
      address.street,
      address.home_number,
      nationalAddressOk,
    ]
  );

  useEffect(() => {
    fetchAppConfig()
      .then((data) => {
        const dp = data?.delivery_price;
        const n = typeof dp === 'number' ? dp : parseFloat(String(dp ?? '0'), 10);
        setConfigDeliveryPrice(Number.isFinite(n) ? n : 0);
      })
      .catch(() => setConfigDeliveryPrice(0));
  }, []);

  useEffect(() => {
    setConfirmedDeliveryFee(null);
  }, [cartKey]);

  useEffect(() => {
    if (step === 0) setConfirmedDeliveryFee(null);
  }, [step]);

  const computedDeliveryFee = useMemo(() => {
    if (!addressFormComplete) return 0;
    return Number(configDeliveryPrice) || 0;
  }, [addressFormComplete, configDeliveryPrice]);

  const displayDeliveryFee =
    confirmedDeliveryFee !== null && confirmedDeliveryFee !== undefined
      ? confirmedDeliveryFee
      : computedDeliveryFee;

  const grandTotal = total + (Number(displayDeliveryFee) || 0);

  if (items.length === 0) return null;

  // Parse user name into first/last
  const defaultCustomer = t('checkoutCustomerDefault');
  const nameParts = (user?.name || defaultCustomer).trim().split(' ');
  const firstName = nameParts[0] || defaultCustomer;
  const lastName = nameParts.slice(1).join(' ') || firstName;
  const phoneNumber = (user?.phone || '').replace(/^\+966/, '').replace(/^0/, '');

  // ── Step 0 → 1: prepare Tap checkout on entering payment step ───────────────
  const handleGoToPayment = () => {
    if (!addressFormComplete) {
      toast.error(t('completeShippingFields'));
      return;
    }
    setStep(1);
  };

  // ── Card: use Tap's hosted page (src_all) — no JS SDK needed ─────────────────
  const handleCardPay = async () => {
    setLoading(true);
    try {
      // Create order ref + get order ID
      const prepRes = await prepareTapCheckout({
        items: orderItems,
        shipping_address: shippingAddressStr,
        short_address: address.short_address || '',
        currency: 'SAR',
      });
      const orderId = prepRes.order?.id || prepRes.order?._id;
      setConfirmedDeliveryFee(prepRes.order?.delivery_fee ?? 0);

      // Charge with src_all → Tap returns INITIATED + transaction.url (hosted card page)
      const chargeRes = await chargeWithToken({
        order_id: orderId,
        token_id: 'src_all',
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: user?.email || '',
          phone: { country_code: '966', number: phoneNumber },
        },
      });

      const chargeId = chargeRes.charge_id;

      if (['CAPTURED', 'COMPLETED'].includes(chargeRes.status)) {
        clearCart();
        setStep(2);
        return;
      }

      if (chargeRes.authentication_url) {
        // Open Tap's hosted payment page in a new tab, then poll
        window.open(chargeRes.authentication_url, '_blank');
        toast(t('completeTapTab'), { duration: 12000 });
        pollCharge(chargeId, orderId);
      } else {
        toast.error(
          lang === 'ar' ? t('paymentFailedGeneric') : chargeRes.message || t('paymentFailedGeneric')
        );
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, lang, t, 'paymentFailedGeneric'));
    } finally {
      setLoading(false);
    }
  };

  // ── Tamara ────────────────────────────────────────────────────────────────────
  const handleTamara = async () => {
    setLoading(true);
    try {
      const res = await createTamaraOrder({
        items: orderItems,
        shipping_address: shippingAddressStr,
        short_address: address.short_address || '',
        currency: 'SAR',
        total_amount: grandTotal,
        customer_phone: user?.phone,
        customer_name: user?.name,
      });

      if (!res.checkout_url) {
        clearCart();
        setStep(2);
        return;
      }

      const orderId = res.order?.id || res.order?._id || res.order_id;
      setConfirmedDeliveryFee(res.order?.delivery_fee ?? 0);

      // Open Tamara in new tab and poll for it to close
      const tamaraTab = window.open(res.checkout_url, '_blank');

      const poll = setInterval(async () => {
        if (!tamaraTab || tamaraTab.closed) {
          clearInterval(poll);
          try {
            await confirmTamaraPayment({ order_id: orderId });
            clearCart();
            setStep(2);
          } catch {
            toast.error(t('confirmPaymentFailed'));
          }
        }
      }, 1500);

      toast(t('completeTamaraTab'), { duration: 10000 });
    } catch (err) {
      toast.error(apiErrorMessage(err, lang, t, 'tamaraFailed'));
    } finally {
      setLoading(false);
    }
  };

  // ── Bank Transfer ─────────────────────────────────────────────────────────────
  const handleBankTransfer = async () => {
    if (!transferProof) { toast.error(t('bankTransferUploadRequired')); return; }
    setLoading(true);
    try {
      await createOrderWithTransferProof({
        items: orderItems,
        transferProofFile: transferProof,
        shippingAddress: shippingAddressStr,
        shortAddress: address.short_address || '',
      });
      setTransferProof(null);
      clearCart();
      setStep(2);
    } catch (err) {
      toast.error(apiErrorMessage(err, lang, t, 'bankTransferFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePay = () => {
    if (paymentMethod === 'card') handleCardPay();
    else if (paymentMethod === 'bank_transfer') handleBankTransfer();
    else handleTamara();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {step < 2 && (
        <button
          type="button"
          onClick={() => (step === 0 ? navigate('/cart') : setStep(0))}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          {step === 0 ? t('backToCart') : t('backToAddress')}
        </button>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              i < step ? 'bg-emerald-500 text-white' :
              i === step ? 'bg-primary text-white' :
              'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${
              i === step ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            }`}>{label}</span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${i < step ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 0: Address ── */}
      {step === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AddressStep
              address={address}
              setAddress={setAddress}
              onNext={handleGoToPayment}
              canContinue={addressFormComplete}
            />
          </div>
          <OrderSummary items={items} total={total} deliveryFee={displayDeliveryFee} lang={lang} />
        </div>
      )}

      {/* ── Step 1: Payment ── */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Address review */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> {t('shippingTo')}
                </h3>
                <button type="button" onClick={() => setStep(0)} className="text-xs text-primary hover:underline">{t('edit')}</button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{shippingAddressStr}</p>
              {address.short_address && (
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{tf('nationalAddressLine', { code: address.short_address })}</p>
              )}
            </div>

            {/* Payment method */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> {t('paymentMethodTitle')}
              </h3>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon, logo, desc }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      paymentMethod === id
                        ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      logo ? 'bg-white border border-gray-100 dark:border-gray-700' : paymentMethod === id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                      {logo
                        ? <img src={logo} alt={label} className="w-full h-full object-contain p-1" />
                        : <Icon className="w-5 h-5" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      paymentMethod === id ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}>
                      {paymentMethod === id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>


              {/* Bank Transfer info */}
              {paymentMethod === 'bank_transfer' && (
                <div className="mt-4 space-y-3">
                  {/* Account details card */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Landmark className="w-4 h-4 text-primary flex-shrink-0" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('bankAccountDetails')}</p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{t('bankName')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-mono">{t('bankIban')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t('bankTransferUploadHint')}</p>
                  </div>

                  {/* File upload */}
                  <div>
                    {transferProof ? (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <p className="flex-1 text-sm text-emerald-700 dark:text-emerald-300 truncate">{transferProof.name}</p>
                        <button
                          type="button"
                          onClick={() => setTransferProof(null)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('bankTransferUploadLabel')}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) { toast.error(t('fileTooLarge')); return; }
                            setTransferProof(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Items summary */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3">{tf('itemsInOrder', { n: items.length })}</h3>
              <div className="space-y-3">
                {items.map(({ product, quantity, price }) => {
                  const title =
                    lang === 'ar'
                      ? (product.title_ar || product.titleAr || product.title || '')
                      : (product.title_en || product.titleEn || product.title || '');
                  const image = resolveMediaUrl(product.images?.[0] || product.image || '');
                  return (
                    <div key={product._id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                        {image
                          ? <img src={image} alt={title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" strokeWidth={1} /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
                        <p className="text-xs text-gray-500">{tf('qtyShort', { n: quantity })}</p>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        <SarAmount amount={price * quantity} iconSize={13} className="text-primary" numberClassName="font-bold" />
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pay button */}
            <button
              type="button"
              onClick={handlePay}
              disabled={loading || (paymentMethod === 'bank_transfer' && !transferProof)}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : paymentMethod === 'card'
                ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span className="inline-flex flex-wrap items-center justify-center gap-1">
                      {t('payViaTapLead')}
                      <SarAmount amount={grandTotal} iconSize={15} className="text-white" numberClassName="text-white font-semibold" />
                      {t('payViaTapTail')}
                    </span>
                  </>
                )
                : paymentMethod === 'bank_transfer'
                ? <><Upload className="w-4 h-4" /> {t('submitBankTransfer')}</>
                : <>{t('continueToTamara')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>}
            </button>
          </div>

          <OrderSummary items={items} total={total} deliveryFee={displayDeliveryFee} lang={lang} />
        </div>
      )}

      {/* ── Step 2: Done ── */}
      {step === 2 && (
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">{t('orderPlaced')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {t('orderPlacedDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={() => navigate('/orders')} className="btn-primary py-3 px-6">{t('viewOrders')}</button>
            <button type="button" onClick={() => navigate('/')} className="btn-outline py-3 px-6">{t('continueShopping')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderSummary({ items, total, deliveryFee, lang }) {
  const { t, tf } = useLanguage();
  const fee = Number(deliveryFee) || 0;
  const grandTotal = total + fee;
  return (
    <div className="card p-5 h-fit sticky top-20">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t('orderSummary')}</h3>
      <div className="space-y-2 text-sm mb-4 max-h-52 overflow-y-auto">
        {items.map(({ product, quantity, stockLabel, price }) => {
          const title =
            lang === 'ar'
              ? (product.title_ar || product.titleAr || product.title || '')
              : (product.title_en || product.titleEn || product.title || '');
          return (
            <div key={product._id} className="flex justify-between gap-2 text-gray-600 dark:text-gray-400">
              <span className="truncate">{title} — {stockLabel} ({tf('cartLineUnits', { n: quantity })})</span>
              <span className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                <SarAmount amount={price * quantity} iconSize={12} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>{t('subtotal')}</span>
          <span><SarAmount amount={total} iconSize={13} /></span>
        </div>
        {fee > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>{t('deliveryFee')}</span>
            <span><SarAmount amount={fee} iconSize={13} /></span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-800">
          <span>{t('total')} <span className="text-xs font-normal text-gray-400">({t('includingVat')})</span></span>
          <span className="text-primary"><SarAmount amount={grandTotal} iconSize={14} className="text-primary" numberClassName="font-bold text-primary" /></span>
        </div>
      </div>
    </div>
  );
}
