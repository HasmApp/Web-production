import { useState, useEffect } from 'react';
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

  const title =
    lang === 'ar'
      ? (room.product_title_ar || room.productTitleAr || room.product_title || room.title || t('auctionItemFallback'))
      : (room.product_title_en || room.product_title || room.title || t('auctionItemFallback'));

  const image = resolveMediaUrl(room.product_image || room.productImage || room.image || '');

  return (
    <div
      className="card overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer group"
      onClick={() => onOpen(room.id || room._id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(room.id || room._id); }}
    >
      {/* Image — large preview */}
      <div className="relative w-full aspect-[4/3] min-h-[200px] sm:min-h-[260px] md:min-h-[300px] max-h-[min(48vh,480px)] bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center p-4 sm:p-6">
        {image ? (
          <img
            src={image}
            alt={title}
            className="max-h-full max-w-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full min-h-[180px] flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" strokeWidth={1} />
          </div>
        )}

        {/* LIVE badge */}
        <div className="absolute top-3 start-3 flex items-center gap-2 bg-red-500 text-white text-sm sm:text-base font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0" />
          {t('liveBadge')}
        </div>

        {/* Countdown — uses time_remaining seed (mirrors mobile) */}
        <div className="absolute bottom-3 end-3 bg-black/65 backdrop-blur-sm text-white px-3 py-2 rounded-full">
          <CountdownTimer
            timeRemaining={timeRemaining}
            endTime={endTime}
            className="text-white !text-base sm:!text-lg"
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {title}
        </h3>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-3 sm:p-4">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-1.5 font-semibold">{t('currentBid')}</p>
            <SarAmount
              amount={currentPrice}
              iconSize={22}
              className="text-xl sm:text-2xl font-extrabold text-primary"
              numberClassName="text-xl sm:text-2xl font-extrabold text-primary tabular-nums"
            />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 sm:p-4">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1.5 font-semibold">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> {t('bidsLabel')}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">
              {bidCount}
            </p>
          </div>
        </div>

        {/* Open detail CTA */}
        <div className="btn-primary w-full py-3.5 sm:py-4 text-base sm:text-lg font-bold flex items-center justify-center gap-2.5 pointer-events-none">
          <Gavel className="w-5 h-5 sm:w-6 sm:h-6" />
          {t('viewAndBid')}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AuctionPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { lang, t } = useLanguage();
  const [auctions, setAuctions]   = useState([]);
  const [wins, setWins]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('live');
  const [openRoomId, setOpenRoomId] = useState(null);
  const [cartSyncingId, setCartSyncingId] = useState(null);

  const goToCartWithAuctionWin = async (room, e) => {
    e.preventDefault();
    e.stopPropagation();
    const roomId = room.id || room._id;
    if (!roomId || cartSyncingId) return;
    setCartSyncingId(roomId);
    try {
      const detail = await fetchAuctionById(roomId);
      const product = detail.product;
      if (!product) {
        toast.error(t('failedLoadAuction'));
        return;
      }
      const pid = detail.product_id || product.id || product._id;
      const qtyRaw = product.quantity ?? room.product_quantity ?? 1;
      const qty = Math.max(1, parseInt(String(qtyRaw), 10) || 1);
      const winTotal = Number(detail.current_price ?? room.current_price ?? 0);
      if (!winTotal || winTotal <= 0) {
        toast.error(t('failedLoadAuction'));
        return;
      }
      const payload = {
        product_id: String(pid),
        product_name: product.title || room.product_title || 'Auction',
        winning_bid: winTotal,
        image_url: product.image || room.product_image || '',
        auction_room_id: String(roomId),
        original_price: product.initial_price != null ? Number(product.initial_price) : undefined,
        quantity: qty,
        sell_full_quantity_only: Boolean(product.sell_full_quantity_only),
      };
      const res = await addAuctionWonToCart(payload);
      const orderId = res.order_id || res.orderId;
      let expiresAt = '';
      if (orderId) {
        try {
          const order = await fetchOrderById(orderId);
          expiresAt = order?.expires_at || order?.expiresAt || '';
        } catch {
          /* optional */
        }
      }
      if (!expiresAt) {
        expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      }
      const unitPrice = winTotal / qty;
      const p = normalizeProduct({
        ...product,
        current_price: unitPrice,
        currentPrice: unitPrice,
      });
      addItem(
        {
          ...p,
          is_auction_won: true,
          auction_won: true,
          auction_expires_at: expiresAt,
          auction_room_id: String(roomId),
        },
        qty,
        'Full'
      );
      navigate('/cart');
      toast.success(t('addedToCartToast'));
    } catch (err) {
      toast.error(apiErrorMessage(err, lang, t, 'bidFailed'));
    } finally {
      setCartSyncingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAuctions();
      setAuctions(Array.isArray(data) ? data : []);
      if (isAuthenticated) {
        const wonData = await fetchMyAuctionWins();
        setWins(Array.isArray(wonData) ? wonData : []);
      }
    } catch {
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isAuthenticated]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
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
          title={t('signInSeeWins')}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
          {wins.map((room) => {
            const winTitle =
              lang === 'ar'
                ? (room.product_title_ar || room.product_title || room.title || t('auctionItemFallback'))
                : (room.product_title_en || room.product_title || room.title || t('auctionItemFallback'));
            const winImage = resolveMediaUrl(room.product_image || room.image || '');
            const winPrice = room.current_price ?? room.currentPrice ?? 0;
            return (
              <div
                key={room.id || room._id}
                className="card overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setOpenRoomId(room.id || room._id)}
              >
                <div className="relative w-full aspect-[4/3] min-h-[200px] sm:min-h-[260px] md:min-h-[300px] max-h-[min(48vh,480px)] bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center p-4 sm:p-6">
                  {winImage ? (
                    <img src={winImage} alt={winTitle} className="max-h-full max-w-full w-auto h-auto object-contain" />
                  ) : (
                    <div className="w-full h-full min-h-[180px] flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-300" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute top-3 start-3 flex items-center gap-2 bg-emerald-500 text-white text-sm sm:text-base font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full">
                    <Trophy className="w-5 h-5 shrink-0" /> {t('wonBadge')}
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-lg sm:text-xl mb-3 leading-snug">{winTitle}</h3>
                  <SarAmount
                    amount={winPrice}
                    iconSize={22}
                    className="text-xl sm:text-2xl font-extrabold text-primary"
                    numberClassName="text-xl sm:text-2xl font-extrabold text-primary tabular-nums"
                  />
                  <button
                    type="button"
                    disabled={Boolean(cartSyncingId)}
                    onClick={(e) => goToCartWithAuctionWin(room, e)}
                    className="btn-primary w-full mt-4 text-base sm:text-lg font-bold py-3.5 sm:py-4 flex items-center justify-center gap-2.5 disabled:opacity-60"
                  >
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
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
