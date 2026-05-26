import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, Truck, XCircle, AlertCircle, MapPin, Warehouse, X,
} from 'lucide-react';
import { fetchMyOrders } from '../services/api.js';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import TabEmptyState from '../components/layout/TabEmptyState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import SarAmount from '../components/common/SarAmount.jsx';
import PickupOnlyBadge from '../components/common/PickupOnlyBadge.jsx';
import { formatOrderDate, getOrderDateParts } from '../utils/formatLocaleDate.js';

const STATUS_META = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', tKey: 'statusPending' },
  confirmed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', tKey: 'statusConfirmed' },
  processing: { icon: AlertCircle, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', tKey: 'statusProcessing' },
  shipped: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', tKey: 'statusShipped' },
  delivered: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', tKey: 'statusDelivered' },
  cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', tKey: 'statusCancelled' },
};

/** Same heuristics as mobile `Order.isBankTransferOrder`. */
function isBankTransferOrder(order) {
  const n = (order.notes ?? '').toString();
  const lower = n.toLowerCase();
  if (lower.includes('transfer proof')) return true;
  if (n.includes('التحويل البنكي')) return true;
  if (lower.includes('bank transfer payment')) return true;
  return false;
}

function isPickupOnlyOrder(order) {
  return order.is_pickup_only === true || order.isPickupOnly === true;
}

/** Matches mobile `Order.canOpenPickupWarehouseDetails`. */
function canOpenPickupWarehouseDetails(order) {
  if (!isPickupOnlyOrder(order)) return true;
  if (!isBankTransferOrder(order)) return true;
  return (order.status ?? '').toLowerCase() !== 'pending';
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const cfg = STATUS_META[status?.toLowerCase()] || STATUS_META.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {t(cfg.tKey)}
    </span>
  );
}

function PickupLocationModal({ order, onClose, t }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!order) return null;

  const addr = (order.pickup_warehouse_address || order.pickupWarehouseAddress || '').trim();
  const contact = (order.pickup_contact_name || order.pickupContactName || '').trim();
  const phoneRaw = (order.pickup_contact_phone || order.pickupContactPhone || '').trim();
  const supplierPhone = (order.supplier_phone || order.supplierPhone || '').trim();
  const phone = phoneRaw || supplierPhone;
  const hasDetails = Boolean(addr || contact || phone);
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pickup-location-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 min-w-0">
            <Warehouse className="w-5 h-5 text-primary shrink-0" />
            <h2 id="pickup-location-title" className="font-bold text-gray-900 dark:text-white text-base truncate">
              {t('pickupLocationTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          {!hasDetails ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t('pickupInfoUnavailable')}</p>
          ) : (
            <>
              {addr ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('warehouseAddressLabel')}</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{addr}</p>
                </div>
              ) : null}
              {contact ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('contactPersonLabel')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{contact}</p>
                </div>
              ) : null}
              {phone ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('phoneNumber')}</p>
                  {telHref ? (
                    <a href={telHref} className="text-sm font-semibold text-primary hover:underline">
                      {phone}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-white">{phone}</p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { lang, t, tf } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickupModalOrder, setPickupModalOrder] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    fetchMyOrders().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="section-title mb-8">{t('myOrders')}</h1>
        <EmptyState
          icon={Package}
          title={t('loginOrdersTitle')}
          description={t('loginOrdersDesc')}
          action={<Link to="/login" className="btn-primary">{t('login')}</Link>}
        />
      </div>
    );
  }

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="section-title mb-8">{t('myOrders')}</h1>

      {orders.length === 0 ? (
        <TabEmptyState
          icon={Package}
          title={t('noOrdersYet')}
          description={t('noOrdersDesc')}
          action={<Link to="/" className="btn-primary">{t('startShopping')}</Link>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const createdAt = order.created_at || order.createdAt;
            const date = formatOrderDate(createdAt, lang);
            const dateParts = lang === 'ar' ? getOrderDateParts(createdAt, 'ar') : null;
            const items = order.items || [];
            const firstItem = items[0];
            const itemTitle =
              lang === 'ar'
                ? (firstItem?.product_title_ar || firstItem?.productTitleAr || firstItem?.title_ar || firstItem?.title || t('orderItemsFallback'))
                : (firstItem?.product_title_en || firstItem?.title || t('orderItemsFallback'));
            const oid = (order._id || order.id)?.slice(-8).toUpperCase();
            const pickup = isPickupOnlyOrder(order);
            const canPickupDetails = canOpenPickupWarehouseDetails(order);
            const showTrack = !pickup && ['shipped', 'processing', 'confirmed', 'out_for_delivery', 'delivered'].includes(order.status?.toLowerCase());

            return (
              <div key={order._id || order.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {itemTitle}{items.length > 1 ? ` ${tf('orderMoreItems', { n: items.length - 1 })}` : ''}
                      </p>
                      {pickup ? (
                        <div className="mt-1.5">
                          <PickupOnlyBadge />
                        </div>
                      ) : null}
                      <p className={`text-xs text-gray-500 dark:text-gray-400 mt-0.5 ${lang === 'ar' ? 'text-end' : ''}`}>
                        {lang === 'ar' ? (
                          <span
                            dir="ltr"
                            className="inline-flex flex-row-reverse items-center gap-1 tabular-nums [unicode-bidi:isolate]"
                          >
                            <span>طلب</span>
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              #{oid}
                            </span>
                          </span>
                        ) : (
                          <span
                            dir="ltr"
                            className="inline-flex flex-row items-center gap-1 tabular-nums [unicode-bidi:isolate]"
                          >
                            <span>Order</span>
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              #{oid}
                            </span>
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{tf('itemsCountLabel', { n: items.length })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 text-end">
                    <StatusBadge status={order.status} />
                    <SarAmount
                      amount={order.total_amount ?? order.totalAmount ?? 0}
                      iconSize={14}
                      className="font-bold text-primary text-sm"
                      numberClassName="font-bold text-primary tabular-nums"
                    />
                    {dateParts ? (
                      <time
                        dir="ltr"
                        className="inline-flex flex-row items-center gap-1 text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap [unicode-bidi:isolate]"
                      >
                        <span>{dateParts.day}</span>
                        <span>{dateParts.month}</span>
                        <span>{dateParts.year}</span>
                      </time>
                    ) : (
                      <time
                        dir="ltr"
                        className="text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap [unicode-bidi:isolate]"
                      >
                        {date}
                      </time>
                    )}
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3">
                      {items.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium max-w-[120px] truncate">
                            {lang === 'ar'
                              ? (item.product_title_ar || item.title_ar || item.product_title_en || item.title)
                              : (item.product_title_en || item.title)}
                          </p>
                          <span className="text-xs text-gray-400">×{item.quantity}</span>
                        </div>
                      ))}
                      {items.length > 4 && (
                        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 flex items-center">
                          <p className="text-xs text-gray-500">{tf('moreItemsShort', { n: items.length - 4 })}</p>
                        </div>
                      )}
                    </div>

                    {pickup && !canPickupDetails ? (
                      <div
                        className="mb-3 flex gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 leading-snug"
                      >
                        <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <span>{t('pickupWarehousePendingBankTransfer')}</span>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {pickup ? (
                        <button
                          type="button"
                          disabled={!canPickupDetails}
                          onClick={() => canPickupDetails && setPickupModalOrder(order)}
                          className="flex items-center gap-1.5 text-xs font-semibold rounded-lg py-2 px-3 bg-primary text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
                        >
                          <Warehouse className="w-3.5 h-3.5" /> {t('viewPickupLocation')}
                        </button>
                      ) : null}
                      {showTrack ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${order._id || order.id}/track`)}
                          className="flex items-center gap-1.5 text-xs font-semibold rounded-lg py-2 px-3 bg-primary text-white hover:opacity-95"
                        >
                          <MapPin className="w-3.5 h-3.5" /> {t('trackShipment')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pickupModalOrder ? (
        <PickupLocationModal order={pickupModalOrder} onClose={() => setPickupModalOrder(null)} t={t} />
      ) : null}
    </div>
  );
}
