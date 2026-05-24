import { formatSubcategoryChipLabel } from '../../utils/formatProductCategory.js';
import { SHOP_SUBCATEGORIES } from '../../constants/shopCategories.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function SubcategoryChips({
  selectedWorld,
  selectedSubcategory,
  onSubcategoryTap,
}) {
  const { t } = useLanguage();
  const list = selectedWorld ? (SHOP_SUBCATEGORIES[selectedWorld] ?? []) : [];
  if (!selectedWorld || list.length === 0) return null;

  const chipClass = (active) =>
    `flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
      active
        ? 'bg-primary text-white shadow-sm'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
    }`;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      <button
        type="button"
        onClick={() => onSubcategoryTap(null)}
        className={chipClass(selectedSubcategory == null)}
      >
        {t('all')}
      </button>
      {list.map((sub) => (
        <button
          type="button"
          key={sub}
          onClick={() => onSubcategoryTap(selectedSubcategory === sub ? null : sub)}
          className={chipClass(selectedSubcategory === sub)}
        >
          {formatSubcategoryChipLabel(selectedWorld, sub, t)}
        </button>
      ))}
    </div>
  );
}
