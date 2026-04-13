import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellOff, TrendingDown, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAlerts, deleteAlert, fetchProductById, resolveMediaUrl } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SarAmount from '../components/common/SarAmount.jsx';

export default function AlertsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { lang, t, tf } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    const load = async () => {
      try {
        const data = await fetchAlerts();
        const list = Array.isArray(data) ? data : [];
        setAlerts(list);
        const productMap = {};
        await Promise.all(
          list.map(async (a) => {
            try {
              const p = await fetchProductById(a.product_id);
              productMap[a.product_id] = p;
            } catch {}
          })
        );
        setProducts(productMap);
      } catch {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const handleDelete = async (alertId) => {
    try {
      await deleteAlert(alertId);
      setAlerts((prev) => prev.filter((a) => (a.id || a._id) !== alertId));
      toast.success(t('alertRemovedToast'));
    } catch {
      toast.error(t('alertRemoveFailed'));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="section-title mb-8">{t('priceAlertsTitle')}</h1>
        <EmptyState
          icon={Bell}
          title={t('signInViewAlerts')}
          action={<Link to="/login" className="btn-primary">{t('login')}</Link>}
        />
      </div>
    );
  }

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="section-title">{t('priceAlertsTitle')}</h1>
          {alerts.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {alerts.length === 1 ? t('alertsActiveCountOne') : tf('alertsActiveCount', { n: alerts.length })}
            </p>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t('noAlertsYet')}
          description={t('alertsLongDesc')}
          action={<Link to="/" className="btn-primary">{t('browseProducts')}</Link>}
        />
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const id = alert.id || alert._id;
            const product = products[alert.product_id];
            const title =
              lang === 'ar'
                ? (product?.title_ar || product?.titleAr || product?.title || t('productFallback'))
                : (product?.title_en || product?.title || t('productFallback'));
            const image = resolveMediaUrl(product?.images?.[0] || product?.image || '');
            const current = product?.current_price ?? 0;
            const target = alert.target_price ?? 0;
            const reached = current <= target;
            const progress = current > 0 ? Math.min(100, (target / current) * 100) : 0;

            return (
              <div key={id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0 cursor-pointer"
                    onClick={() => product && navigate(`/product/${alert.product_id}`)}
                  >
                    {image ? (
                      <img src={image} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-300" strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-gray-900 dark:text-white text-sm truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => product && navigate(`/product/${alert.product_id}`)}
                    >
                      {title}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">{t('currentPrice')}</p>
                        <SarAmount
                          amount={current}
                          iconSize={14}
                          className="font-bold text-gray-900 dark:text-white"
                          numberClassName="font-bold tabular-nums text-gray-900 dark:text-white"
                        />
                      </div>
                      <TrendingDown className="w-4 h-4 text-gray-300" />
                      <div>
                        <p className="text-xs text-gray-400">{t('yourTarget')}</p>
                        <SarAmount
                          amount={target}
                          iconSize={14}
                          className={`font-bold ${reached ? 'text-emerald-500' : 'text-primary'}`}
                          numberClassName={`font-bold tabular-nums ${reached ? 'text-emerald-500' : 'text-primary'}`}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-emerald-500' : 'bg-primary'}`}
                          style={{ width: `${Math.max(4, progress)}%` }}
                        />
                      </div>
                      {reached && (
                        <p className="text-xs text-emerald-500 font-semibold mt-1">{t('reachedTarget')}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(id)}
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title={t('deleteAlert')}
                  >
                    <BellOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
