import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { logoUrl } from '../assets/branding.js';

export default function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="rounded-3xl bg-primary-50 dark:bg-primary-900/20 px-6 py-4 flex items-center justify-center mb-6">
        <img src={logoUrl} alt={t('brandName')} className="h-14 w-auto max-w-[200px] object-contain dark:brightness-110" />
      </div>
      <h1 className="text-6xl font-extrabold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('pageNotFoundTitle')}</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
        {t('pageNotFoundDesc')}
      </p>
      <Link to="/" className="btn-primary py-3 px-6">
        <Home className="w-4 h-4" /> {t('backToHome')}
      </Link>
    </div>
  );
}
