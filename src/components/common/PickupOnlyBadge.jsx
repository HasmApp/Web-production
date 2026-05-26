import { Warehouse } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

/** Matches mobile `AppColors.pickupOnlyAccent` (#2563EB) + white label. */
export default function PickupOnlyBadge({ size = 'sm', className = '', city = '' }) {
  const { t } = useLanguage();
  const isSmall = size === 'sm';
  const cityTrim = (city ?? '').toString().trim();
  const label = cityTrim ? `${t('badgePickupOnly')}: ${cityTrim}` : t('badgePickupOnly');
  return (
    <span
      className={`inline-flex max-w-full items-center gap-0.5 rounded-md font-bold text-white bg-[#2563EB] border border-[rgba(255,255,255,0.22)] ${
        isSmall ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-xs'
      } ${className}`.trim()}
    >
      <Warehouse className={isSmall ? 'h-2.5 w-2.5 shrink-0' : 'h-3.5 w-3.5 shrink-0'} strokeWidth={2.5} aria-hidden />
      <span className="leading-tight truncate" dir="auto">{label}</span>
    </span>
  );
}
