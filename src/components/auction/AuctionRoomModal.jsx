import { useState, useEffect } from 'react';
import {
  X, Package, ChevronLeft, ChevronRight, Users,
  TrendingUp, Gavel, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAuctionById, placeBid, resolveMediaUrl } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { apiErrorMessage } from '../../utils/apiErrorMessage.js';
import { formatProductCategory } from '../../utils/formatProductCategory.js';
import CountdownTimer from './CountdownTimer.jsx';
import SarAmount from '../common/SarAmount.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

export default function AuctionRoomModal({ roomId, onClose, onBidPlaced }) {
  const { isAuthenticated } = useAuth();
  const { lang, t, tf } = useLanguage();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);

  const load = async () => {
    try {
      const data = await fetchAuctionById(roomId);
      setRoom(data);
    } catch {
      toast.error(t('failedLoadAuction'));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [roomId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBid = async () => {
    if (!isAuthenticated) { toast.error(t('signInToBid')); return; }
    const amount = parseFloat(bidAmount);
    const minNext = (room?.current_price ?? 0) + 0.01;
    if (!amount || amount < minNext) {
      toast.error(tf('bidMustHigher', { amount: (room?.current_price ?? 0).toFixed(2) }));
      return;
    }
    setBidding(true);
    try {
      await placeBid(roomId, amount);
      toast.success(tf('bidPlaced', { amount: amount.toFixed(2) }));
      setBidAmount('');
      await load(); // refresh room data
      onBidPlaced?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, lang, t, 'bidFailed'));
    } finally {
      setBidding(false);
    }
  };

  // Derived values
  const product = room?.product;
  const rawImages = product?.images?.length
    ? product.images
    : [product?.image].filter(Boolean);
  const images = rawImages.map((u) => resolveMediaUrl(u)).filter(Boolean);

  const title = product
    ? (lang === 'ar'
        ? (product.title_ar || product.titleAr || product.title || '')
        : (product.title_en || product.titleEn || product.title || ''))
    : '';

  const currentPrice = room?.current_price ?? 0;
  const initialPrice = product?.initial_price ?? product?.initialPrice ?? 0;
  const minimumPrice = product?.minimum_price ?? product?.minimumPrice ?? 0;

  // Progress: how much of the range has the price dropped
  const priceProgress = initialPrice > minimumPrice
    ? Math.max(0, Math.min(100, ((initialPrice - currentPrice) / (initialPrice - minimumPrice)) * 100))
    : 0;

  const bids = room?.bids ?? [];
  const timeRemaining = room?.time_remaining ?? room?.timeRemaining;
  const endTime = room?.end_time || room?.endTime;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {t('liveBadge')}
            </div>
            {(timeRemaining !== undefined || endTime) && (
              <CountdownTimer
                timeRemaining={timeRemaining}
                endTime={endTime}
                className="text-gray-700 dark:text-gray-300"
              />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* ── Left: Images ─────────────────────────────────── */}
              <div className="p-5 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
                {/* Main image */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 mb-3 flex items-center justify-center">
                  {images[imgIdx] ? (
                    <img
                      src={images[imgIdx]}
                      alt={title}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-gray-300" strokeWidth={1} />
                  )}

                  {/* Prev/next arrows (if multiple images) */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                        className="absolute start-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 shadow flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                        className="absolute end-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 shadow flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail strip */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImgIdx(i)}
                        className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${
                          imgIdx === i
                            ? 'border-primary'
                            : 'border-gray-100 dark:border-gray-800 opacity-60'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Dot indicators */}
                {images.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImgIdx(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === imgIdx ? 'bg-primary w-4' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Right: Info & Bid ─────────────────────────────── */}
              <div className="p-5 space-y-5">
                <div>
                  {product?.category && (
                    <p className="text-xs font-semibold text-primary mb-1 leading-snug" dir="auto">
                      {formatProductCategory(product.category, t)}
                    </p>
                  )}
                  <h2 className="text-lg font-extrabold text-gray-900 dark:text-white leading-snug">
                    {title}
                  </h2>
                </div>

                {/* Price block */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
                  {/* Current bid */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      {t('currentBid')}
                    </p>
                    <SarAmount
                      amount={currentPrice}
                      iconSize={18}
                      className="text-2xl font-extrabold text-primary"
                      numberClassName="text-2xl font-extrabold text-primary tabular-nums"
                    />
                  </div>

                  {/* Price-drop progress bar */}
                  {initialPrice > 0 && minimumPrice > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-400 mb-1" dir="auto">
                        <span>{t('auctionInitialPriceLabel')}: {initialPrice.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-primary rounded-full transition-all duration-700"
                          style={{ width: `${priceProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      {tf('auctionBidsCount', { n: bids.length })}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {t('auctionTimeLeftLabel')}:{' '}
                      <CountdownTimer
                        timeRemaining={timeRemaining}
                        endTime={endTime}
                        className="font-semibold text-gray-700 dark:text-gray-300 text-xs"
                      />
                    </span>
                  </div>
                </div>

                {/* Bid form */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('auctionYourBidLabel')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={t('auctionBidPlaceholder')}
                      className="input flex-1 py-2.5 text-sm"
                      min={currentPrice + 0.01}
                      step="0.01"
                    />
                    <button
                      type="button"
                      onClick={handleBid}
                      disabled={bidding || !bidAmount}
                      className="btn-primary px-4 py-2.5 text-sm flex-shrink-0"
                    >
                      {bidding ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><Gavel className="w-4 h-4" /> {t('placeBid')}</>
                      )}
                    </button>
                  </div>
                  {!isAuthenticated && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {t('signInToBid')}
                    </p>
                  )}
                </div>

                {/* Recent bids */}
                {bids.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      {t('auctionRecentBidsHeading')}
                    </h3>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                      {bids.slice().reverse().slice(0, 10).map((bid, i) => (
                        <div
                          key={bid.id || i}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${
                            i === 0
                              ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary/20'
                              : 'bg-gray-50 dark:bg-gray-800'
                          }`}
                        >
                          <span className="text-gray-600 dark:text-gray-400 text-xs">
                            {i === 0 && (
                              <span className="text-primary font-bold me-1">★</span>
                            )}
                            {bid.bidder_name || bid.bidderName || tf('auctionAnonymousBidder', { n: bids.length - i })}
                          </span>
                          <SarAmount
                            amount={bid.bid_amount ?? bid.bidAmount ?? 0}
                            iconSize={12}
                            className={`text-sm font-bold tabular-nums ${i === 0 ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}
                            numberClassName={`font-bold tabular-nums ${i === 0 ? 'text-primary' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
