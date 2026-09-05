import { useState, useEffect, useMemo, useCallback } from 'react';
import { Gavel, Trophy } from 'lucide-react';
import {
  fetchAuctions,
  fetchMyAuctionWins,
  resolveMediaUrl,
} from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import SarAmount from '../common/SarAmount.jsx';
import CountdownTimer from './CountdownTimer.jsx';
import {
  auctionRoomListTitle,
  filterAuctionRooms,
  filterWonAuctionRooms,
  isActiveAuctionRoom,
  enrichAuctionRoomsFromDetail,
  auctionRemainingSeconds,
} from '../../utils/auctionUtils.js';
import { LIVE_PRICE_TEXT_CLASS, PRODUCT_RAIL_CARD_CLASS } from '../../design/shopTokens.js';

/** Same width as product grid cells in Home/Deals (`gap-5` = 1.25rem). */
const RAIL_CARD_WIDTH_CLASS = PRODUCT_RAIL_CARD_CLASS;

function AuctionRailCard({ entry, onOpen }) {
  const { t, lang, tf } = useLanguage();
  const { room, isWon } = entry;
  const title = auctionRoomListTitle(room, lang, t('auctionItemFallback'));
  const image = resolveMediaUrl(room.product_image || room.productImage || room.image || '');
  const price = room.current_price ?? room.currentPrice ?? 0;
  const bidCount = room.bid_count ?? room.bidCount ?? 0;
  const timeRemaining = room.time_remaining ?? room.timeRemaining;
  const endTime = room.end_time || room.endTime;

  return (
    <button
      type="button"
      onClick={() => onOpen(room.id || room._id)}
      className="group flex w-full min-w-0 flex-col text-start rounded-xl bg-white shadow-md transition-all duration-300 hover:opacity-[0.97] dark:bg-gray-900"
    >
      <div className="px-2 pt-2">
        <div className="relative aspect-[100/82] w-full overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
          {image ? (
            <img
              src={image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-700">
              <Gavel className="h-12 w-12" strokeWidth={1} />
            </div>
          )}
          <span
            className={`absolute top-3 start-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold text-white shadow ${
              isWon
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                : 'bg-gradient-to-r from-primary to-primary-700'
            }`}
          >
            {isWon ? <Trophy className="h-3 w-3" /> : <Gavel className="h-3 w-3" />}
            {isWon ? t('wonBadge') : t('auctionOpportunityBadge')}
          </span>
          {!isWon && auctionRemainingSeconds(room) > 0 && (
            <span className="absolute bottom-3 start-3 end-3 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/50 bg-black/65 px-2 py-1.5 text-xs font-bold text-white">
              <CountdownTimer
                timeRemaining={auctionRemainingSeconds(room)}
                endTime={endTime}
                className="!text-xs !text-white"
              />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-2 py-1.5 pb-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
          {title}
        </h3>
        <div className="mt-auto pt-1">
          <div className="flex w-full justify-start">
            <div
              dir="ltr"
              className="inline-flex max-w-full items-baseline gap-1.5"
            >
              <SarAmount
                amount={price}
                iconSize={15}
                className={`text-lg font-bold ${LIVE_PRICE_TEXT_CLASS}`}
                numberClassName={`text-lg font-bold tabular-nums ${LIVE_PRICE_TEXT_CLASS}`}
              />
              <span className="truncate text-xs font-semibold text-gray-500 dark:text-gray-400">
                {tf('auctionBidsCount', { n: bidCount })}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span className="btn-primary inline-flex w-full items-center justify-center py-1.5 text-xs font-bold">
              {isWon ? t('purchase') : t('viewAndBid')}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function AuctionRailSection({ onOpenRoom }) {
  const { isAuthenticated } = useAuth();
  const { lang, t } = useLanguage();
  const [allRooms, setAllRooms] = useState([]);
  const [wonRooms, setWonRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  /** Local countdown ticks (mobile seeds time_remaining then decrements). */
  const [remainByRoomId, setRemainByRoomId] = useState({});
  const [listTick, setListTick] = useState(0);

  const roomKey = (room) => String(room.id || room._id || '');

  const seedRemainders = useCallback((rooms) => {
    const next = {};
    for (const room of Array.isArray(rooms) ? rooms : []) {
      const id = roomKey(room);
      if (!id) continue;
      const active = room?.is_active ?? room?.isActive;
      next[id] = active === false ? 0 : auctionRemainingSeconds(room);
    }
    setRemainByRoomId(next);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchAuctions();
      const arr = Array.isArray(data) ? data : [];
      let won = [];
      if (isAuthenticated) {
        const wonData = await fetchMyAuctionWins();
        won = Array.isArray(wonData) ? wonData : [];
      }
      setAllRooms(arr);
      setWonRooms(won);
      seedRemainders([...arr, ...won]);
      enrichAuctionRoomsFromDetail(arr)
        .then((enriched) => {
          setAllRooms(enriched);
          seedRemainders([...enriched, ...won]);
        })
        .catch(() => {});
      if (won.length > 0) {
        enrichAuctionRoomsFromDetail(won)
          .then(setWonRooms)
          .catch(() => {});
      }
    } catch {
      setAllRooms([]);
      setWonRooms([]);
      setRemainByRoomId({});
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, seedRemainders]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Refresh auction list when tab wakes (same idea as mobile AppLifecycle resumed).
  useEffect(() => {
    let dead = false;
    let timer = null;

    const refresh = async () => {
      if (dead) return;
      await load();
    };

    const schedule = () => {
      if (dead) return;
      const ms = document.hidden ? 25000 : 15000;
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, ms);
    };

    schedule();

    const onResume = () => { refresh(); };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);

    return () => {
      dead = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
    };
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemainByRoomId((prev) => {
        const out = {};
        for (const [k, v] of Object.entries(prev)) {
          out[k] = Math.max(0, v - 1);
        }
        return out;
      });
      setListTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const visibleEntries = useMemo(() => {
    void listTick;
    const won = filterWonAuctionRooms(wonRooms);
    const wonIds = new Set(won.map((r) => String(r.id || r._id)));
    const active = filterAuctionRooms(
      allRooms.filter((room) => {
        const id = roomKey(room);
        if (wonIds.has(id)) return false;
        const left = remainByRoomId[id] ?? auctionRemainingSeconds(room);
        const activeFlag = room?.is_active ?? room?.isActive;
        return left > 0 && activeFlag !== false;
      }),
    );
    return [
      ...won.map((room) => ({ room, isWon: true })),
      ...active.map((room) => ({ room, isWon: false })),
    ];
  }, [allRooms, wonRooms, listTick]);

  if (loading || visibleEntries.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="mb-3 px-0.5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {t('shopAuctionRailTitle')}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {t('shopAuctionRailSub')}
        </p>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {visibleEntries.map((entry) => (
          <div
            key={entry.room.id || entry.room._id}
            className={`flex-shrink-0 snap-start ${RAIL_CARD_WIDTH_CLASS}`}
          >
            <AuctionRailCard
              entry={entry}
              onOpen={onOpenRoom}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
