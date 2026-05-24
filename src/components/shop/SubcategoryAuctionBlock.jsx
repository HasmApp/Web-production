import SubcategoryChips from './SubcategoryChips.jsx';
import AuctionRailSection from '../auction/AuctionRailSection.jsx';

/** Subcategory chips + live auction rail — matches mobile `ShopSubcategoryAuctionBlock`. */
export default function SubcategoryAuctionBlock({
  selectedWorld,
  selectedSubcategory,
  onSubcategoryTap,
  onOpenAuctionRoom,
}) {
  if (!selectedWorld) return null;

  return (
    <div className="space-y-3 mb-4">
      <SubcategoryChips
        selectedWorld={selectedWorld}
        selectedSubcategory={selectedSubcategory}
        onSubcategoryTap={onSubcategoryTap}
      />
      <AuctionRailSection
        selectedWorld={selectedWorld}
        selectedSubcategory={selectedSubcategory}
        onOpenRoom={onOpenAuctionRoom}
      />
    </div>
  );
}
