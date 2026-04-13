import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

/**
 * Countdown timer — mirrors the mobile app's implementation.
 *
 * Priority (same as Dart):
 *  1. `timeRemaining` (seconds from API `time_remaining`) — used as the seed,
 *     then counted down locally every second.
 *  2. `endTime` (ISO string) — fallback: computed once and counted down.
 *
 * Using `time_remaining` avoids client-timezone / clock-skew issues that make
 * `end_time - Date.now()` drift when the client's clock differs from the server.
 */
export default function CountdownTimer({ timeRemaining: seedSeconds, endTime, className = '' }) {
  const { t } = useLanguage();

  // Resolve initial value: prefer the server-supplied seconds seed.
  const getInitial = () => {
    if (typeof seedSeconds === 'number' && seedSeconds >= 0) return seedSeconds;
    if (endTime) {
      const diff = Math.floor((new Date(endTime) - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return 0;
  };

  const [remaining, setRemaining] = useState(getInitial);
  // Track whether the seed has changed (e.g. after a poll refresh).
  const prevSeedRef = useRef(seedSeconds);

  // If the server sends a fresh time_remaining that differs by more than 2s from
  // our local countdown, resync (same idea as mobile's WebSocket update path).
  useEffect(() => {
    if (typeof seedSeconds !== 'number') return;
    if (Math.abs(seedSeconds - prevSeedRef.current) > 2) {
      setRemaining(seedSeconds);
    }
    prevSeedRef.current = seedSeconds;
  }, [seedSeconds]);

  // Local 1-second countdown (mirrors Timer.periodic in Dart).
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // run once; state update drives itself

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
  const isUrgent = remaining < 300; // < 5 min
  /** Always HH:MM:SS (aligned with mobile app + supplier dashboard). */
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
