import { useLanguage } from '../../contexts/LanguageContext.jsx';

function StampSvg({ hero = false }) {
  return (
    <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden>
      <circle
        cx="20"
        cy="20"
        r="18.5"
        fill="none"
        stroke={hero ? 'rgba(255,255,255,0.5)' : 'currentColor'}
        className={hero ? undefined : 'text-emerald-200/80 dark:text-emerald-400/40'}
        strokeWidth="1"
        strokeDasharray="3.5 2.5"
      />
      <circle
        cx="20"
        cy="20"
        r="14"
        fill={hero ? 'rgba(16,185,129,0.85)' : undefined}
        className={hero ? undefined : 'fill-emerald-500'}
      />
      <polyline
        points="12,20 17,25 28,14"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CertifiedStampIcon({ className = 'w-10 h-10', hero = false }) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <StampSvg hero={hero} />
    </div>
  );
}

/** Trust strip — certified / verified products with green stamp (hero + card). */
export default function CertifiedProductsBanner({
  variant = 'card',
  className = '',
  title,
  subtitle,
}) {
  const { t, lang } = useLanguage();
  const isHero = variant === 'hero';
  const textAlign = lang === 'ar' ? 'text-right' : 'text-left';
  const heading = title || t('certifiedTitle');
  const line = subtitle || t('certifiedSub');

  if (isHero) {
    return (
      <div
        className={`inline-flex items-center gap-3 self-start rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md ${className}`}
      >
        <CertifiedStampIcon hero />
        <div className={textAlign}>
          <p className="text-sm font-bold leading-tight text-white">{heading}</p>
          <p className="mt-0.5 text-xs text-white/70">{line}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5 ${className}`}
      dir="ltr"
    >
      <div className="flex items-center gap-4 sm:gap-5">
        <div className={`flex-shrink-0 ${lang === 'ar' ? 'order-last' : ''}`}>
          <CertifiedStampIcon className="w-11 h-11 sm:w-12 sm:h-12" />
        </div>
        <div
          className={`hidden h-10 w-px flex-shrink-0 bg-gray-200 dark:bg-gray-700 sm:block ${
            lang === 'ar' ? 'order-3' : ''
          }`}
        />
        <div className={`min-w-0 flex-1 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
            {heading}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{line}</p>
        </div>
        <div className={`hidden flex-shrink-0 sm:flex ${lang === 'ar' ? 'order-first' : ''}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t('certifiedBadge')}
          </span>
        </div>
      </div>
    </div>
  );
}
