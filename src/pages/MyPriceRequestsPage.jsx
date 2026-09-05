import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { fetchMyPriceRequests, fetchProductById } from '../services/api.js';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import SarAmount from '../components/common/SarAmount.jsx';
import { useCart } from '../contexts/CartContext.jsx';

function ProductName({ row, lang, t }) {
  const name =
    lang === 'ar'
      ? (row.product_title_ar || row.product_name || row.product_id)
      : (row.product_title_en || row.product_name || row.product_id);
  return <span>{name || t('productFallback')}</span>;
}

export default function MyPriceRequestsPage() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchMyPriceRequests();
        if (mounted) setRows(Array.isArray(data) ? data : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <PageLoader />;

  const isAutoApproved = (row) =>
    row?.status === 'approved' &&
    String(row?.decision_note || '').toLowerCase().includes('auto-approved');

  const handleBuyNow = async (row) => {
    try {
      setProcessingId(row.id);
      const product = await fetchProductById(row.product_id);
      const qty = Math.max(1, Math.floor(Number(row.quantity || 1) || 1));
      const offered = Number(row.offered_price || 0);
      const unit = qty > 0 && offered > 0 ? offered / qty : offered;
      const patched = {
        ...product,
        current_price: unit,
        currentPrice: unit,
        _offerLocked: true,
      };
      addItem(patched, qty, 'Full');
      navigate('/checkout');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">
        {t('myPriceRequests')}
      </h1>

      {rows.length === 0 ? (
        <div className="card p-6 text-sm text-gray-500 dark:text-gray-400">{t('noPriceRequestsYet')}</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    <ProductName row={r} lang={lang} t={t} />
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('quantity')}: {r.quantity}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                    {t('offeredPrice')}:
                    <SarAmount amount={Number(r.offered_price || 0)} iconSize={12} />
                  </p>
                  {r.message ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.message}</p>
                  ) : null}
                  {r.decision_note ? (
                    <p
                      className={`text-sm mt-1 ${
                        isAutoApproved(r)
                          ? 'text-green-700 dark:text-green-300 font-medium'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {r.decision_note}
                    </p>
                  ) : null}
                  {isAutoApproved(r) ? (
                    <span className="inline-flex mt-2 text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      {t('autoApproved')}
                    </span>
                  ) : null}
                  {r.status === 'approved' ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleBuyNow(r)}
                        disabled={processingId === r.id}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        {processingId === r.id ? t('loading') : t('addToCart')}
                      </button>
                    </div>
                  ) : null}
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    r.status === 'approved'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : r.status === 'rejected'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
