import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  // New route = scroll to top (avoids staying scrolled from e.g. home #products into the footer on /product/:id).
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
