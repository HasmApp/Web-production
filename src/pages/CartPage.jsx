import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, ArrowRight, Package, Tag } from 'lucide-react';
import { resolveMediaUrl } from '../services/api.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SarAmount from '../components/common/SarAmount.jsx';
import { formatProductCategory } from '../utils/formatProductCategory.js';
import toast from 'react-hot-toast';

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t, tf, lang } = useLanguage();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error(t('loginToCheckout'));
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="section-title mb-8">{t('yourCart')}</h1>
        <EmptyState
          icon={ShoppingCart}
          title={t('cartEmpty')}
          description={t('cartEmptyDesc')}
          action={<Link to="/" className="btn-primary">{t('browseProducts')}</Link>}
        />
      </div>
    );
  }

  const { product, quantity, stockLabel, price } = items[0];
  const title =
    lang === 'ar'
      ? (product.title_ar || product.titleAr || product.title || '')
      : (product.title_en || product.titleEn || product.title || '');
  const image = resolveMediaUrl(product.images?.[0] || product.image || '');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">{t('yourCart')}</h1>
        <button type="button" onClick={clearCart} className="text-sm text-red-500 hover:underline font-medium">
          {t('clear')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-4 flex gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              {image ? (
                <img src={image} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-10 h-10 text-gray-300" strokeWidth={1} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link
                to={`/product/${product._id}`}
                className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary line-clamp-2 block"
              >
                {title}
              </Link>
              <p className="text-xs text-gray-400 mt-0.5" dir="auto">
                {formatProductCategory(product.category || '', t)}
              </p>

              <div className="flex items-center gap-1.5 mt-2">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {stockLabel} — {tf('cartLineUnits', { n: quantity })}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <SarAmount
                  amount={price * quantity}
                  iconSize={14}
                  className="font-bold text-primary text-sm"
                  numberClassName="font-bold text-primary"
                />
                <button
                  type="button"
                  onClick={() => { removeItem(); toast(t('itemRemoved')); }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card p-6 sticky top-20 space-y-4">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">{t('orderSummary')}</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('subtotal')}</span>
                <SarAmount amount={total} iconSize={14} className="text-sm text-gray-600 dark:text-gray-400" numberClassName="tabular-nums" />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base">
                <span>{t('total')}</span>
                <SarAmount amount={total} iconSize={16} className="text-primary" numberClassName="tabular-nums font-bold text-primary" />
              </div>
            </div>

            <button type="button" onClick={handleCheckout} className="btn-primary w-full py-3 text-base mt-2">
              {t('proceedToCheckout')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>

            <Link to="/" className="block text-center text-sm text-primary hover:underline">
              {t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
