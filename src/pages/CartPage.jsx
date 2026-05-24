import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import useLiveProductCatalog from '../hooks/useLiveProductCatalog.js';
import TabEmptyState from '../components/layout/TabEmptyState.jsx';
import CartGroupCard from '../components/cart/CartGroupCard.jsx';
import { BOTTOM_NAV_EMPTY_STATE_CLEARANCE } from '../design/shopTokens.js';
import toast from 'react-hot-toast';

export default function CartPage() {
  const {
    items,
    hasStashedItems,
    supplierGroups,
    removeItem,
    isolateCheckoutForGroup,
    restoreStashedItems,
    syncLivePricesFromCatalog,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { products: catalog } = useLiveProductCatalog();

  useEffect(() => {
    if (items.length === 0 && hasStashedItems) {
      restoreStashedItems();
    }
  }, [items.length, hasStashedItems, restoreStashedItems]);

  useEffect(() => {
    if (catalog.length > 0) {
      syncLivePricesFromCatalog(catalog);
    }
  }, [catalog, syncLivePricesFromCatalog]);

  const groups = supplierGroups(catalog);

  const handleCheckoutGroup = (groupKey) => {
    if (!isAuthenticated) {
      toast.error(t('loginToCheckout'));
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    isolateCheckoutForGroup(groupKey);
    navigate('/checkout', { state: { checkoutGroupKey: groupKey } });
  };

  if (items.length === 0) {
    return (
      <div style={{ paddingBottom: BOTTOM_NAV_EMPTY_STATE_CLEARANCE }}>
        <TabEmptyState
          icon={ShoppingCart}
          title={t('cartEmpty')}
          description={t('cartEmptyDesc')}
          action={<Link to="/" className="btn-primary">{t('browseProducts')}</Link>}
        />
      </div>
    );
  }

  return (
    <div
      className="max-w-3xl mx-auto px-4 py-6 animate-fade-in"
      style={{ paddingBottom: BOTTOM_NAV_EMPTY_STATE_CLEARANCE + 16 }}
    >
      <h1 className="section-title mb-6">{t('shopNavCart')}</h1>
      <div className="space-y-4">
        {groups.map((group) => (
          <CartGroupCard
            key={group.groupKey}
            group={group}
            catalog={catalog}
            onCheckoutGroup={handleCheckoutGroup}
            onRemoveLine={removeItem}
          />
        ))}
      </div>
      <Link
        to="/"
        className="mt-6 block text-center text-sm text-primary hover:underline"
      >
        {t('continueShopping')}
      </Link>
    </div>
  );
}
