import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Gavel, Users, Trophy, Package, Flame, ShoppingCart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../utils/apiErrorMessage.js';
import {
  fetchAuctions,
  fetchMyAuctionWins,
  fetchAuctionById,
  fetchOrderById,
  addAuctionWonToCart,
  normalizeProduct,
  resolveMediaUrl,
} from '../services/api.js';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import AuctionRoomModal from '../components/auction/AuctionRoomModal.jsx';
import SarAmount from '../components/common/SarAmount.jsx';
import { excludePackageAuctionRooms } from '../utils/auctionUtils.js';
import { checkoutAuctionWinSafe } from '../utils/auctionCheckout.js';
import config from '../config/config.js';

/** Same idea as mobile `AuctionRoomSummary._firstNonEmpty` / `fromJson` title keys. */
function firstNonEmpty(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of keys) {
    if (!(key in obj)) continue;
    const v = obj[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

const ROOM_TITLE_AR_KEYS = [
  'product_title_ar', 'productTitleAr', 'title_ar', 'titleAr',
  'name_ar', 'nameAr', 'product_name_ar', 'productNameAr',
];
const ROOM_TITLE_EN_KEYS = [
  'product_title_en', 'productTitleEn', 'title_en', 'titleEn',
  'name_en', 'nameEn', 'product_name_en', 'productNameEn',
];
const PRODUCT_TITLE_AR_KEYS = [
  'title_ar', 'titleAr', 'name_ar', 'nameAr', 'product_title_ar', 'productTitleAr',
];
const PRODUCT_TITLE_EN_KEYS = [
  'title_en', 'titleEn', 'name_en', 'nameEn', 'product_title_en', 'productTitleEn',
];
const FALLBACK_TITLE_KEYS = ['product_title', 'productTitle', 'title', 'name'];

/** Localized list/win card title — matches mobile `AuctionRoomSummary.fromJson` + `getProductTitleForLocale`. */
function auctionRoomListTitle(room, lang, fallback) {
  const product = room?.product && typeof room.product === 'object' ? room.product : null;
  if (lang === 'ar') {
    let t = firstNonEmpty(room, ROOM_TITLE_AR_KEYS);
    if (!t && product) t = firstNonEmpty(product, PRODUCT_TITLE_AR_KEYS);
    if (t) return t;
    let fb = firstNonEmpty(room, FALLBACK_TITLE_KEYS);
    if (!fb && product) fb = firstNonEmpty(product, ['title', 'name', 'product_title', 'productTitle']);
    return fb || fallback;
  }
  let t = firstNonEmpty(room, ROOM_TITLE_EN_KEYS);
  if (!t && product) t = firstNonEmpty(product, PRODUCT_TITLE_EN_KEYS);
  if (t) return t;
  let fb = firstNonEmpty(room, FALLBACK_TITLE_KEYS);
  if (!fb && product) fb = firstNonEmpty(product, ['title_en', 'titleEn', 'title', 'name']);
  return fb || fallback;
}

/** Mirrors mobile `_enrichMissingLocalizedTitles`: list payload may omit _en/_ar while GET /auctions/:id has them. */
function roomNeedsLocalizedEnrich(room, lang) {
  const product = room?.product && typeof room.product === 'object' ? room.product : null;
  if (lang === 'ar') {
    const t = firstNonEmpty(room, ROOM_TITLE_AR_KEYS)
      || (product && firstNonEmpty(product, PRODUCT_TITLE_AR_KEYS));
    return !t;
  }
  const t = firstNonEmpty(room, ROOM_TITLE_EN_KEYS)
    || (product && firstNonEmpty(product, PRODUCT_TITLE_EN_KEYS));
  return !t;
}

/** Avoid re-fetching auction detail on every silent poll once we have `product` for a room. */
const fetchedAuctionProductById = new Map();

function mergeRoomWithProduct(room, prod) {
  return {
    ...room,
    product_title_ar: room.product_title_ar || prod.title_ar || prod.titleAr,
    product_title_en: room.product_title_en || prod.title_en || prod.titleEn,
    productTitleAr: room.productTitleAr || prod.title_ar || prod.titleAr,
    productTitleEn: room.productTitleEn || prod.title_en || prod.titleEn,
    product: room.product ?? prod,
  };
}

async function enrichAuctionRoomsFromDetail(rooms, lang) {
  if (!Array.isArray(rooms) || rooms.length === 0) return rooms;
  return Promise.all(
    rooms.map(async (room) => {
      if (!roomNeedsLocalizedEnrich(room, lang)) return room;
      const id = String(room.id || room._id);
      let prod = fetchedAuctionProductById.get(id);
      if (!prod) {
        const detail = await fetchAuctionById(id).catch(() => null);
        prod = detail?.product ? normalizeProduct(detail.product) : null;
        if (prod) fetchedAuctionProductById.set(id, prod);
      }
      return prod ? mergeRoomWithProduct(room, prod) : room;
    })
  );
}

/**
 * Summary card for the auction list.
 * Uses `current_price` (not `current_bid_price`) — matches the mobile AuctionRoomSummary model.
 * Timer uses `time_remaining` (seconds from API) as seed, same as mobile.
 */
function AuctionCard({ room, onOpen }) {
  const { lang, t } = useLanguage();

  // ── Field mapping (AuctionRoomSummary) ──────────────────────────────────────
  // API: current_price, time_remaining, end_time, bid_count, product_image
  const currentPrice  = room.current_price  ?? room.currentPrice  ?? 0;
  const timeRemaining = room.time_remaining ?? room.timeRemaining; // seconds
  const endTime       = room.end_time       || room.endTime;
  const bidCount      = room.bid_count      ?? room.bidCount      ?? 0;

  const title = auctionRoomListTitle(room, lang, t('auctionItemFallback'));

  const image = resolveMediaUrl(room.product_image || room.productImage || room.image || '');

  return (
    <div
      className="card overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer group"
      onClick={() => onOpen(room.id || room._id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(room.id || room._id); }}
    >
      {/* Image — compact preview */}
      <div className="relative w-full aspect-[4/3] min-h-[160px] sm:min-h-[200px] md:min-h-[220px] max-h-[min(40vh,380px)] bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center p-3 sm:p-4">
        {image ? (
          <img
            src={image}
            alt={title}
            className="max-h-full max-w-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full min-h-[140px] flex items-center justify-center">
            <Package className="w-12 h-12 sm:w-14 sm:h-14 text-gray-300" strokeWidth={1} />
          </div>
        )}

        {/* LIVE + pickup */}
        <div className="absolute top-2.5 start-2.5 z-10 flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-1.5 bg-red-500 text-white text-xs sm:text-sm font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white animate-pulse shrink-0" />
            {t('liveBadge')}
          </div>
          {/* pickup-only badge intentionally shown only inside AuctionRoomModal */}
        </div>

        {/* Countdown — uses time_remaining seed (mirrors mobile) */}
        <div className="absolute bottom-2.5 end-2.5 bg-black/65 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-full">
          <CountdownTimer
            timeRemaining={timeRemaining}
            endTime={endTime}
            className="text-white !text-sm sm:!text-base"
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-2">
          <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white line-clamp-2 leading-snug flex-1 min-w-0">
            {title}
          </h3>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-2.5 sm:p-3">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 font-semibold">{t('currentBid')}</p>
            <SarAmount
              amount={currentPrice}
              iconSize={18}
              className="text-lg sm:text-xl font-extrabold text-primary"
              numberClassName="text-lg sm:text-xl font-extrabold text-primary tabular-nums"
            />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 sm:p-3">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1 font-semibold">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> {t('bidsLabel')}
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tabular-nums">
              {bidCount}
            </p>
          </div>
        </div>

        {/* Open detail CTA */}
        <div className="btn-primary w-full py-2.5 sm:py-3 text-sm sm:text-base font-bold flex items-center justify-center gap-2 pointer-events-none">
          <Gavel className="w-4 h-4 sm:w-5 sm:h-5" />
          {t('viewAndBid')}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AuctionPage() {
  const navigate = useNavigate();
  const { replaceCartForAuctionWin } = useCart();
  const { isAuthenticated } = useAuth();
  const { lang, t } = useLanguage();
  const [auctions, setAuctions]   = useState([]);
  const [wins, setWins]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('live');
  const [openRoomId, setOpenRoomId] = useState(null);
  const [cartSyncingId, setCartSyncingId] = useState(null);
  const wsHealthyRef = useRef(false);

  const goToCartWithAuctionWin = async (room, e) => {
    e.preventDefault();
    e.stopPropagation();
    const roomId = room.id || room._id;
    if (!roomId || cartSyncingId) return;
    setCartSyncingId(roomId);
    await checkoutAuctionWinSafe({
      room,
      replaceCartForAuctionWin,
      navigate,
      t,
      lang,
    });
    setCartSyncingId(null);
  };

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchAuctions();
      const arr = excludePackageAuctionRooms(Array.isArray(data) ? data : []);
      setAuctions(arr);
      enrichAuctionRoomsFromDetail(arr, lang)
        .then(setAuctions)
        .catch(() => {});
      if (isAuthenticated) {
        const wonData = await fetchMyAuctionWins();
        const winsArr = excludePackageAuctionRooms(Array.isArray(wonData) ? wonData : []);
        setWins(winsArr);
        enrichAuctionRoomsFromDetail(winsArr, lang)
          .then(setWins)
          .catch(() => {});
      } else {
        setWins([]);
      }
    } catch {
      if (!silent) setAuctions([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isAuthenticated, lang]);

  // Keep auction cards fresh even when WS is unavailable/throttled.
  useEffect(() => {
    let dead = false;
    let timer = null;

    const refresh = async () => {
      if (dead) return;
      await load({ silent: true });
    };

    const schedule = () => {
      if (dead) return;
      const ms = document.hidden ? 25000 : (wsHealthyRef.current ? 15000 : 4000);
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, ms);
    };

    refresh();
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
  }, [isAuthenticated, lang]);

  // Real-time auction price updates via WS, with reconnect.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    let ws = null;
    let dead = false;
    let reconnectTimer = null;
    let reconnectAttempts = 0;

    const scheduleReconnect = () => {
      if (dead) return;
      const delay = Math.min(10000, 1000 * (2 ** reconnectAttempts));
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (dead) return;
      try {
        const url = token
          ? `${config.wsBaseUrl}/ws/prices?token=${token}`
          : `${config.wsBaseUrl}/ws/prices`;
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        reconnectAttempts = 0;
        wsHealthyRef.current = true;
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const update = msg.type === 'price_update' ? msg.data : msg;
          if (!update?.product_id || update.current_price === undefined) return;
          setAuctions((prev) => prev.map((room) => {
            const roomPid = room.product_id || room.productId;
            if (roomPid !== update.product_id) return room;
            return { ...room, current_price: update.current_price, currentPrice: update.current_price };
          }));
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => {
        wsHealthyRef.current = false;
        scheduleReconnect();
      };
    };

    const initialTimer = setTimeout(connect, 300);
    return () => {
      dead = true;
      wsHealthyRef.current = false;
      clearTimeout(initialTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [isAuthenticated]);

  const tabs = [
    { id: 'live', label: t('liveAuctionsTitle'), icon: Flame,  count: auctions.length },
    { id: 'won',  label: t('tabMyWins'),         icon: Trophy, count: wins.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-lg font-bold px-4 py-2.5 rounded-full mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          {t('liveBidding')}
        </div>
        <h1 className="section-title mb-3 text-3xl sm:text-4xl lg:text-5xl">{t('auctionsTitle')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl leading-relaxed max-w-3xl">{t('auctionsIntro')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-10 w-fit">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-lg font-bold transition-all ${
              tab === id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-6 h-6 shrink-0" />
            {label}
            {count > 0 && (
              <span className={`text-base px-2.5 py-0.5 rounded-full font-bold ${
                tab === id
                  ? 'bg-primary-50 text-primary'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <PageLoader />
      ) : tab === 'live' ? (
        auctions.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title={t('noLiveAuctions')}
            description={t('noLiveAuctionsDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {auctions.map((room) => (
              <AuctionCard
                key={room.id || room._id}
                room={room}
                onOpen={setOpenRoomId}
              />
            ))}
          </div>
        )
      ) : !isAuthenticated ? (
        <EmptyState
          icon={Trophy}
          title={t('loginSeeWins')}
          action={<Link to="/login" className="btn-primary">{t('login')}</Link>}
        />
      ) : wins.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={t('noWinsTitle')}
          description={t('noWinsDesc')}
          action={<button type="button" onClick={() => setTab('live')} className="btn-primary">{t('browseAuctionsBtn')}</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {wins.map((room) => {
            const winTitle = auctionRoomListTitle(room, lang, t('auctionItemFallback'));
            const winImage = resolveMediaUrl(room.product_image || room.image || '');
            const winPrice = room.current_price ?? room.currentPrice ?? 0;
            return (
              <div
                key={room.id || room._id}
                className="card overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setOpenRoomId(room.id || room._id)}
              >
                <div className="relative w-full aspect-[4/3] min-h-[160px] sm:min-h-[200px] md:min-h-[220px] max-h-[min(40vh,380px)] bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center p-3 sm:p-4">
                  {winImage ? (
                    <img src={winImage} alt={winTitle} className="max-h-full max-w-full w-auto h-auto object-contain" />
                  ) : (
                    <div className="w-full h-full min-h-[140px] flex items-center justify-center">
                      <Package className="w-12 h-12 sm:w-14 sm:h-14 text-gray-300" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute top-2.5 start-2.5 z-10 flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full">
                      <Trophy className="w-4 h-4 shrink-0" /> {t('wonBadge')}
                    </div>
                    {/* pickup-only badge intentionally shown only inside AuctionRoomModal */}
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-base sm:text-lg mb-2 leading-snug">{winTitle}</h3>
                  <SarAmount
                    amount={winPrice}
                    iconSize={18}
                    className="text-lg sm:text-xl font-extrabold text-primary"
                    numberClassName="text-lg sm:text-xl font-extrabold text-primary tabular-nums"
                  />
                  <button
                    type="button"
                    disabled={Boolean(cartSyncingId)}
                    onClick={(e) => goToCartWithAuctionWin(room, e)}
                    className="btn-primary w-full mt-3 text-sm sm:text-base font-bold py-2.5 sm:py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    {cartSyncingId === (room.id || room._id) ? t('loading') : t('goToCart')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room detail modal */}
      {openRoomId && (
        <AuctionRoomModal
          roomId={openRoomId}
          onClose={() => setOpenRoomId(null)}
          onBidPlaced={load}
        />
      )}
    </div>
  );
}
