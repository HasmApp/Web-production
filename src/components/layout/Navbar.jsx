import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Heart, Gavel, Package, User, Menu, X,
  Sun, Moon, Search, Bell, LogOut, Settings, TrendingDown, Languages,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { logoUrl } from '../../assets/branding.js';

const navLinks = [
  { to: '/', labelKey: 'home', icon: TrendingDown },
  { to: '/auctions', labelKey: 'auctions', icon: Gavel },
  { to: '/orders', labelKey: 'orders', icon: Package },
  { to: '/favorites', labelKey: 'favorites', icon: Heart },
];

export default function Navbar() {
  const { isAuthenticated, user, logout, sessionPending } = useAuth();
  const { count } = useCart();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [dark, setDark] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchTimerRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleSearch = (e) => {
    e.preventDefault();
    const val = query.trim();
    navigate(val ? `/?q=${encodeURIComponent(val)}` : '/');
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      navigate(val.trim() ? `/?q=${encodeURIComponent(val.trim())}` : '/');
    }, 300);
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center min-h-20 h-20 gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center py-1.5 mr-3 sm:mr-4 flex-shrink-0"
            aria-label={t('brandName')}
          >
            <img
              src={logoUrl}
              alt=""
              className="h-[3.25rem] sm:h-[4.25rem] md:h-[4.5rem] w-auto max-w-[min(360px,78vw)] object-contain object-start dark:brightness-110"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-primary bg-primary-50 dark:bg-primary-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search */}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="btn-ghost w-9 h-9 p-0 rounded-xl"
              aria-label={t('ariaSearch')}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme */}
            <button
              type="button"
              onClick={() => setDark(!dark)}
              className="btn-ghost w-9 h-9 p-0 rounded-xl hidden sm:flex"
              aria-label={t('ariaTheme')}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="btn-ghost h-9 px-2 sm:px-2.5 rounded-xl flex items-center gap-1.5"
              aria-label={t('language')}
              title={t('language')}
            >
              <Languages className="w-4 h-4" />
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 tabular-nums min-w-[1.25rem]">
                {lang === 'en' ? 'AR' : 'EN'}
              </span>
            </button>

            {/* Cart */}
            <Link to="/cart" className="btn-ghost w-9 h-9 p-0 rounded-xl relative">
              <ShoppingCart className="w-4 h-4" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>

            {/* Profile / Login — sessionPending avoids Login flash while /auth/me runs */}
            {sessionPending ? (
              <div
                className="h-9 min-w-[5.5rem] rounded-xl bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0"
                aria-busy="true"
                aria-label={t('loading')}
              />
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block max-w-[min(200px,38vw)] truncate"
                    dir="auto"
                  >
                    {user?.name || t('accountFallback')}
                  </span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 card shadow-xl border border-gray-100 dark:border-gray-800 py-1 animate-slide-up">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Settings className="w-4 h-4" /> {t('profileSettings')}
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Package className="w-4 h-4" /> {t('orders')}
                    </Link>
                    <Link
                      to="/alerts"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Bell className="w-4 h-4" /> {t('priceAlerts')}
                    </Link>
                    <hr className="my-1 border-gray-100 dark:border-gray-800" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-4 h-4" /> {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-xs px-4 py-2">
                {t('login')}
              </Link>
            )}

            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn-ghost w-9 h-9 p-0 rounded-xl md:hidden"
              aria-label={t('ariaMenu')}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <form onSubmit={handleSearch} className="pb-3 animate-slide-up">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rtl:left-auto rtl:right-3" />
              <input
                type="search"
                value={query}
                onChange={handleSearchChange}
                placeholder={t('search')}
                className="input pl-9 pr-4 rtl:pl-4 rtl:pr-9"
                autoFocus
              />
            </div>
          </form>
        )}

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden border-t border-gray-100 dark:border-gray-800 py-3 flex flex-col gap-1 animate-slide-up">
            {navLinks.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'text-primary bg-primary-50 dark:bg-primary-900/20'
                      : 'text-gray-700 dark:text-gray-300'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {t(labelKey)}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => { setDark(!dark); setMenuOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {dark ? t('lightMode') : t('darkMode')}
            </button>
            <button
              type="button"
              onClick={() => { setLang(lang === 'en' ? 'ar' : 'en'); setMenuOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <Languages className="w-4 h-4" />
              {lang === 'en' ? t('arabic') : t('english')}
            </button>
          </nav>
        )}
      </div>

      {/* Click outside to close profile dropdown */}
      {profileOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
      )}
    </header>
  );
}
