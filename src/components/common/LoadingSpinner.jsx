import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} border-4 border-primary-100 border-t-primary rounded-full animate-spin`}
      />
    </div>
  );
}

export function PageLoader() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 border-4 border-primary-100 border-t-primary rounded-full animate-spin" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">{t('loading')}</p>
    </div>
  );
}
