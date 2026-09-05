import { Link, useLocation } from 'react-router-dom';
import { Home, Tag, ShoppingBag, Package, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { BOTTOM_NAV_HEIGHT } from '../../design/shopTokens.js';

const TABS = [
  { to: '/', labelKey: 'shopNavHome', icon: Home, match: (path) => path === '/' },
  { to: '/marketplace', labelKey: 'shopNavDeals', icon: Tag, match: (path) => path === '/marketplace' || path === '/deals' },
  // LEGACY: demand is a homepage section, not a nav button.
  // { to: '/demand', labelKey: 'shopNavDemand', icon: ClipboardList, match: (path) => path.startsWith('/demand') },
  { to: '/cart', labelKey: 'shopNavCart', icon: ShoppingBag, match: (path) => path.startsWith('/cart') },
  { to: '/orders', labelKey: 'shopNavOrders', icon: Package, match: (path) => path.startsWith('/orders') },
  { to: '/profile', labelKey: 'shopNavAccount', icon: User, match: (path) => path.startsWith('/profile') },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { count } = useCart();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md safe-area-pb"
      style={{ height: BOTTOM_NAV_HEIGHT }}
      aria-label={t('shopBottomNavAria')}
    >
      <ul className="grid h-full grid-cols-5">
        {TABS.map(({ to, labelKey, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                  active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="relative inline-flex shrink-0">
                  <Icon
                    className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`}
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden
                  />
                  {to === '/cart' && count > 0 ? (
                    <span className="absolute -top-1.5 -end-1.5 z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white tabular-nums">
                      {count > 99 ? '99+' : count}
                    </span>
                  ) : null}
                </span>
                <span className="leading-tight px-0.5 text-center">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
