import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Phone, Mail, LogOut, Package, Heart, Bell,
  ChevronRight, Trash2, Sun, Moon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteAccount } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { termsOfServiceUrl } from '../assets/branding.js';

function ProfileRow({ icon: Icon, label, value, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 transition-colors text-start ${
        danger
          ? 'hover:bg-red-50 dark:hover:bg-red-900/10'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-primary-50 dark:bg-primary-900/20'
      }`}>
        <Icon className={`w-4 h-4 ${danger ? 'text-red-500' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs mb-0.5 ${danger ? 'text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{label}</p>
        <p className={`text-sm font-medium truncate ${danger ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
          {value || '—'}
        </p>
      </div>
      {onClick && <ChevronRight className={`w-4 h-4 flex-shrink-0 rtl:rotate-180 ${danger ? 'text-red-300' : 'text-gray-300 dark:text-gray-600'}`} />}
    </button>
  );
}

export default function ProfilePage() {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('profileGuestTitle')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('profileGuestDesc')}</p>
        <Link to="/login" className="btn-primary">{t('login')}</Link>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    toast.success(t('signedOut'));
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      logout();
      toast.success(t('accountDeleted'));
      navigate('/');
    } catch {
      toast.error(t('deleteAccountFailed'));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const initial = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-400 to-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
          <span className="text-white text-3xl font-extrabold">{initial}</span>
        </div>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{user?.name || t('profileDefaultDisplayName')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{user?.phone || ''}</p>
      </div>

      {/* Info card */}
      <div className="card divide-y divide-gray-100 dark:divide-gray-800 mb-4">
        <ProfileRow icon={User} label={t('nameLabel')} value={user?.name} />
        <ProfileRow icon={Phone} label={t('phoneNumber')} value={user?.phone} />
        {user?.email && <ProfileRow icon={Mail} label={t('emailLabel')} value={user.email} />}
      </div>

      {/* Quick links */}
      <div className="card divide-y divide-gray-100 dark:divide-gray-800 mb-4">
        <ProfileRow icon={Package} label={t('myOrders')} value={t('orders')} onClick={() => navigate('/orders')} />
        <ProfileRow icon={Heart} label={t('favorites')} value={t('favorites')} onClick={() => navigate('/favorites')} />
        <ProfileRow icon={Bell} label={t('priceAlerts')} value={t('priceAlerts')} onClick={() => navigate('/alerts')} />
      </div>

      {/* Settings */}
      <div className="card divide-y divide-gray-100 dark:divide-gray-800 mb-4">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setDark(!dark)}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-start"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
            {dark ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('appearance')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('darkMode')}</p>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform ${dark ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
          </div>
        </button>
      </div>

      {/* Danger zone */}
      <div className="card divide-y divide-gray-100 dark:divide-gray-800 mb-4">
        <ProfileRow
          icon={Trash2}
          label={t('dangerZone')}
          value={t('deleteMyAccount')}
          onClick={() => setShowDeleteConfirm(true)}
          danger
        />
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-500 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        {t('logout')}
      </button>

      <p className="text-center text-xs text-gray-400 mt-6">
        <a
          href={termsOfServiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {t('termsOfService')}
        </a>
      </p>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card p-6 max-w-sm w-full animate-slide-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white text-center mb-2">{t('deleteAccountTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              {t('deleteAccountConfirm')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-outline flex-1 py-2.5"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : t('deleteAccount')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
