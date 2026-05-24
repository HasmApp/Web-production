import ProductCard from '../product/ProductCard.jsx';
import { PRODUCT_RAIL_CARD_CLASS } from '../../design/shopTokens.js';

/** Horizontal product rail — matches mobile `ProductRailSection`. */
export default function ProductRailSection({
  title,
  subtitle,
  products,
  deliveryIsFree = false,
  dealPriceDisplay = false,
}) {
  if (!products?.length) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 px-0.5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {products.map((product) => (
          <div
            key={product._id || product.id}
            className={PRODUCT_RAIL_CARD_CLASS}
          >
            <ProductCard
              product={product}
              deliveryIsFree={deliveryIsFree}
              dealPriceDisplay={dealPriceDisplay}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
