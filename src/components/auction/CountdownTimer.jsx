import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

/**
 * Auction countdown — aligned with the auction dialog.
 *
 * Uses server `end_time` when present so the timer stays correct after sleep,
 * tab backgrounding, or a closed laptop (wall-clock based, not interval ticks).
 * Falls back to `time_remaining` seed + local deadline when `end_time` is missing.
 */
export default function CountdownTimer({ timeRemaining: seedSeconds, endTime, className = '' }) {
  const { t } = useLanguage();
  const deadlineMsRef = useRef(null);
  const prevSeedRef = useRef(seedSeconds);

  const computeFromProps = useCallback(() => {
    if (endTime) {
      const endMs = new Date(endTime).getTime();
      if (Number.isFinite(endMs)) {
        deadlineMsRef.current = endMs;
        return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      }
    }
    if (typeof seedSeconds === 'number' && seedSeconds >= 0) {
      deadlineMsRef.current = Date.now() + seedSeconds * 1000;
      return seedSeconds;
    }
    deadlineMsRef.current = null;
    return 0;
  }, [seedSeconds, endTime]);

  const readRemaining = useCallback(() => {
    if (deadlineMsRef.current != null) {
      return Math.max(0, Math.floor((deadlineMsRef.current - Date.now()) / 1000));
    }
    return 0;
  }, []);

  const [remaining, setRemaining] = useState(computeFromProps);

  // Resync when API sends a new seed or end time (poll / WS / modal refresh).
  useEffect(() => {
    const next = computeFromProps();
    const local = readRemaining();
    if (typeof seedSeconds === 'number') {
      if (Math.abs(seedSeconds - prevSeedRef.current) > 2 || Math.abs(seedSeconds - local) > 2) {
        setRemaining(next);
      } else if (endTime) {
        setRemaining(next);
      }
      prevSeedRef.current = seedSeconds;
    } else {
      setRemaining(next);
    }
  }, [seedSeconds, endTime, computeFromProps, readRemaining]);

  useEffect(() => {
    const tick = () => setRemaining(readRemaining());

    tick();
    const id = setInterval(tick, 1000);

    const onResume = () => {
      if (endTime || typeof seedSeconds === 'number') {
        setRemaining(computeFromProps());
      } else {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
    };
  }, [endTime, seedSeconds, computeFromProps, readRemaining]);

  if (remaining <= 0) {
    return (
      <span className={`text-red-500 font-bold text-sm ${className}`}>
        {t('auctionEnded')}
      </span>
    );
  }

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const isUrgent = remaining < 300;
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold tabular-nums text-sm ${
        isUrgent ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'
      } ${className}`}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      {hms}
    </span>
  );
}

function pad(n) {
  return String(n).padStart(2, '0');
}
