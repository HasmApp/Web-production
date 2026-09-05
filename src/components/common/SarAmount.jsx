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
  iconPosition = 'start',
  prefix = '',
  currency = 'SAR',
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
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
        /* Latin digits always use Inter so AR pages match EN sizing/alignment (Tajawal digits sit high/small next to the icon). */
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {String(currency).toUpperCase() === 'SAR' ? (
        <CurrencyIcon
          size={iconSize}
          color="currentColor"
          className={`shrink-0 opacity-90 ${iconClassName}`.trim()}
        />
      ) : (
        <span className={`shrink-0 text-[0.7em] leading-none opacity-90 ${iconClassName}`.trim()}>
          {String(currency).toUpperCase()}
        </span>
      )}
      <span className={`tabular-nums leading-none ${numberClassName}`.trim()}>{formatted}</span>
    </span>
  );
}
