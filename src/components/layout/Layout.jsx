import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ShopHomeFooter from './ShopHomeFooter.jsx';
import MobileBottomNav from './MobileBottomNav.jsx';
import { BOTTOM_NAV_HEIGHT } from '../../design/shopTokens.js';

const SHOP_TAB_PATHS = ['/marketplace', '/deals', '/demand', '/cart', '/orders', '/profile'];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const showMobileShopNav = SHOP_TAB_PATHS.includes(pathname);

  // New route = scroll to top (avoids staying scrolled from e.g. home #products into the footer on /product/:id).
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark">
      <Navbar />
      <main
        className="flex-1"
        style={showMobileShopNav ? { paddingBottom: BOTTOM_NAV_HEIGHT } : undefined}
      >
        {children}
      </main>
      {pathname === '/marketplace' ? (
        <ShopHomeFooter withBottomNav={showMobileShopNav} />
      ) : (
        !showMobileShopNav ? <Footer /> : null
      )}
      {showMobileShopNav ? <MobileBottomNav /> : null}
    </div>
  );
}
