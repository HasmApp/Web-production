import { BOTTOM_NAV_EMPTY_STATE_CLEARANCE } from '../../design/shopTokens.js';
import EmptyState from '../common/EmptyState.jsx';

/** Matches mobile `ShopTabEmptyState` — centered above bottom nav. */
export default function TabEmptyState({ icon: Icon, title, description, action }) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center px-4"
      style={{ paddingBottom: BOTTOM_NAV_EMPTY_STATE_CLEARANCE }}
    >
      <EmptyState icon={Icon} title={title} description={description} action={action} />
    </div>
  );
}
