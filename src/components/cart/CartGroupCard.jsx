import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Package, ShoppingBag } from 'lucide-react';
import { resolveMediaUrl } from '../../services/api.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import SarAmount from '../common/SarAmount.jsx';
import { billableLineTotal, checkoutDisplayQuantity } from '../../utils/bogoPromotion.js';
import { productIdKey, suggestMoreForCartGroup } from '../../utils/supplierCart.js';
import { LIVE_PRICE_TEXT_CLASS } from '../../design/shopTokens.js';
import ProductCard from '../product/ProductCard.jsx';

function CartLine({ item, onRemove }) {
  const { t, tf, lang } = useLanguage();
  const { product } = item;
  const lineTotal = billableLineTotal(item);
  const [priceChanged, setPriceChanged] = useState(false);

  useEffect(() => {
    setPriceChanged(true);
    const timer = setTimeout(() => setPriceChanged(false), 600);
    return () => clearTimeout(timer);
  }, [lineTotal]);

  const title =
    lang === 'ar'
      ? product.title_ar || product.titleAr || product.title || ''
      : product.title_en || product.titleEn || product.title || '';
  const image = resolveMediaUrl(product.images?.[0] || product.image || '');

  return (
    <div className="flex gap-3 border-b border-gray-100 dark:border-gray-800 px-3 py-3 last:border-0">
      <Link
        to={`/product/${productIdKey(product)}`}
        className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800"
      >
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-8 w-8 text-gray-300" strokeWidth={1} />
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/product/${productIdKey(product)}`}
          className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-primary"
        >
          {title}
        </Link>
        <p className="mt-1 text-xs font-semibold text-primary" dir="auto">
          {item.size ? `${item.size} · ` : ''}{tf('cartLineUnits', { n: checkoutDisplayQuantity(item) })}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <SarAmount
            amount={lineTotal}
            iconSize={14}
            className={`text-sm font-bold transition-all duration-300 ${LIVE_PRICE_TEXT_CLASS} ${priceChanged ? 'scale-110' : ''}`}
            numberClassName={`font-bold tabular-nums ${LIVE_PRICE_TEXT_CLASS}`}
          />
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 transition-colors hover:text-red-500"
            aria-label={t('removeFromCart')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartGroupCard({ group, catalog, onCheckoutGroup, onRemoveLine }) {
  const { t } = useLanguage();
  const suggestions = suggestMoreForCartGroup(group, catalog || [], 8);

  return (
    <div className="card overflow-hidden">
      {group.items.map((item) => (
        <CartLine
          key={`${productIdKey(item.product)}-${item.stockLabel}-${item.size || ''}`}
          item={item}
          onRemove={() => onRemoveLine(item.productId, item.size || null)}
        />
      ))}

      {suggestions.length > 0 ? (
        <div className="border-t border-gray-100 px-2 py-3 dark:border-gray-800">
          <p className="mb-2 px-1 text-xs font-bold text-primary">{t('supplierAddMoreSave')}</p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {suggestions.map((product) => (
              <div key={productIdKey(product)} className="w-[min(240px,70vw)] flex-shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-gray-100 p-3 dark:border-gray-800">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            {t('supplierGroupSubtotal')}
          </span>
          <SarAmount
            amount={group.subtotal}
            iconSize={14}
            className="font-extrabold text-primary"
            numberClassName="font-extrabold text-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => onCheckoutGroup(group.groupKey)}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3"
        >
          <ShoppingBag className="h-4 w-4" />
          {t('purchase')}
        </button>
      </div>
    </div>
  );
}
