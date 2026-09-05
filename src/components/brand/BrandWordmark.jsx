import { useLanguage } from '../../contexts/LanguageContext.jsx';

const SIZE_AR = {
  sm: 'text-2xl',
  md: 'text-3xl sm:text-4xl',
  lg: 'text-4xl sm:text-5xl',
  xl: 'text-5xl sm:text-6xl',
};

const SIZE_EN = {
  sm: 'text-lg',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-3xl',
  xl: 'text-3xl sm:text-4xl',
};

/** Arabic wordmark uses Thmanyah Sans (خط ثمانية الرقمي). English matches content. */
export default function BrandWordmark({ invert = false, size = 'md', className = '' }) {
  const { t, lang } = useLanguage();
  const isEn = lang === 'en';
  const sizes = isEn ? SIZE_EN : SIZE_AR;
  return (
    <span
      className={`brand-wordmark ${isEn ? 'brand-wordmark--en' : ''} ${invert ? 'brand-wordmark--invert' : ''} ${sizes[size] || sizes.md} ${className}`}
    >
      {t('brandName')}
    </span>
  );
}
