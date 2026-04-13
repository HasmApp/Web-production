import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, XCircle, AlertCircle, MapPin } from 'lucide-react';
import { fetchMyOrders } from '../services/api.js';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import SarAmount from '../components/common/SarAmount.jsx';

const STATUS_META = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', tKey: 'statusPending' },
  confirmed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', tKey: 'statusConfirmed' },
  processing: { icon: AlertCircle, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', tKey: 'statusProcessing' },
  shipped: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', tKey: 'statusShipped' },
  delivered: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', tKey: 'statusDelivered' },
  cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', tKey: 'statusCancelled' },
};

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

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { lang, t, tf } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
          title={t('signInOrdersTitle')}
          description={t('signInOrdersDesc')}
          action={<Link to="/login" className="btn-primary">{t('login')}</Link>}
        />
      </div>
    );
  }

  if (loading) return <PageLoader />;

  const dateLocale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-SA';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="section-title mb-8">{t('myOrders')}</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('noOrdersYet')}
          description={t('noOrdersDesc')}
          action={<Link to="/" className="btn-primary">{t('startShopping')}</Link>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const date = new Date(order.created_at || order.createdAt).toLocaleDateString(dateLocale, {
              year: 'numeric', month: 'short', day: 'numeric',
            });
            const items = order.items || [];
            const firstItem = items[0];
            const itemTitle =
              lang === 'ar'
                ? (firstItem?.product_title_ar || firstItem?.productTitleAr || firstItem?.title_ar || firstItem?.title || t('orderItemsFallback'))
                : (firstItem?.product_title_en || firstItem?.title || t('orderItemsFallback'));
            const oid = (order._id || order.id)?.slice(-8).toUpperCase();
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {tf('orderNumberShort', { id: oid })} · {date}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{tf('itemsCountLabel', { n: items.length })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusBadge status={order.status} />
                    <SarAmount
                      amount={order.total_amount ?? order.totalAmount ?? 0}
                      iconSize={14}
                      className="font-bold text-primary text-sm"
                      numberClassName="font-bold text-primary tabular-nums"
                    />
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
                    {['shipped', 'processing', 'confirmed', 'out_for_delivery', 'delivered'].includes(order.status?.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${order._id || order.id}/track`)}
                        className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5" /> {t('trackShipment')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
