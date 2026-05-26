import SubcategoryChips from './SubcategoryChips.jsx';
import AuctionRailSection from '../auction/AuctionRailSection.jsx';

/** Subcategory chips (when a world is selected) + global live auction rail. */
export default function SubcategoryAuctionBlock({
  selectedWorld,
  selectedSubcategory,
  onSubcategoryTap,
  onOpenAuctionRoom,
}) {
  return (
    <div className="space-y-3 mb-4">
      {selectedWorld ? (
        <SubcategoryChips
          selectedWorld={selectedWorld}
          selectedSubcategory={selectedSubcategory}
          onSubcategoryTap={onSubcategoryTap}
        />
      ) : null}
      <AuctionRailSection onOpenRoom={onOpenAuctionRoom} />
    </div>
  );
}
