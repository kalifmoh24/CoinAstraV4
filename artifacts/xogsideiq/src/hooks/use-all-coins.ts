import { useState, useEffect, useRef } from "react";
import {
  startBgSync,
  onCoinUpdate,
  getStoredCoins,
  getSyncProgress,
  type CoinMarket,
  type SyncProgress,
} from "@/lib/bg-sync";

export type { CoinMarket, SyncProgress };

/**
 * Provides the full live coin list backed by the background sync engine.
 * - Hydrates instantly from IndexedDB on mount (zero network wait if cached)
 * - Subscribes to bgSync updates so prices refresh silently every 30s
 * - Never returns null/undefined — always a stable array
 */
export function useAllCoins() {
  const coinMapRef = useRef<Map<string, CoinMarket>>(new Map());
  const [coins, setCoins]       = useState<CoinMarket[]>([]);
  const [progress, setProgress] = useState<SyncProgress>(getSyncProgress());
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    // ── 1. Instant hydration from IndexedDB ──────────────────────────────────
    getStoredCoins().then(stored => {
      if (!mounted || stored.length === 0) return;
      const map = new Map<string, CoinMarket>(stored.map(c => [c.id, c]));
      coinMapRef.current = map;
      setCoins(stored); // already sorted by market_cap_rank
      setProgress(getSyncProgress());
    });

    // ── 2. Live updates from bgSync ──────────────────────────────────────────
    const off = onCoinUpdate((pageCoins, page) => {
      if (!mounted) return;
      const map = coinMapRef.current;
      pageCoins.forEach(c => map.set(c.id, c));

      // Sort by market cap rank — fast even at 17k items
      const sorted = Array.from(map.values()).sort(
        (a, b) => (a.market_cap_rank ?? 999_999) - (b.market_cap_rank ?? 999_999)
      );
      setCoins(sorted);
      setProgress(getSyncProgress());
      if (page === 1) setLastRefreshedAt(Date.now());
    });

    // ── 3. Start the sync engine (idempotent) ────────────────────────────────
    startBgSync();

    return () => {
      mounted = false;
      off();
    };
  }, []);

  return {
    coins,
    progress,
    ready: coins.length > 0,
    lastRefreshedAt,
  };
}
