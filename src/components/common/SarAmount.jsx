import CurrencyIcon from './CurrencyIcon.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

/**
 * Riyal icon + amount (LTR), Latin digits; aligned for RTL pages.
 */
export default function SarAmount({
  amount,
  iconSize = 14,
  className = '',
  iconClassName = '',
  numberClassName = '',
}) {
  const { isRTL } = useLanguage();
  const n = parseFloat(amount ?? 0);
  /** Latin digits 0–9 for both EN and AR UI (avoid Eastern Arabic numerals). */
  const nf = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formatted = Number.isFinite(n) ? nf.format(n) : nf.format(0);

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${isRTL ? 'currency-rtl' : ''} ${className}`.trim()}
      style={{ direction: 'ltr', unicodeBidi: 'isolate', lineHeight: 1 }}
    >
      <CurrencyIcon
        size={iconSize}
        color="currentColor"
        className={`flex-shrink-0 opacity-90 ${iconClassName}`.trim()}
      />
      <span
        className={`tabular-nums translate-y-px ${numberClassName}`.trim()}
        style={{ lineHeight: 1 }}
      >
        {formatted}
      </span>
    </span>
  );
}
