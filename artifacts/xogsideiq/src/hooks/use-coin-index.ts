import { useState, useEffect, useCallback, useRef } from "react";
import { idbGet, idbSet } from "@/lib/idb-cache";

export interface CoinEntry { id: string; symbol: string; name: string; }

const IDB_KEY = "coinastra:coin_list_v2";
const TTL = 6 * 60 * 60 * 1000; // 6 hours

// Module-level singleton so any component reuse shares the same data
let _cache: CoinEntry[] | null = null;
let _loading = false;
const _listeners: Set<() => void> = new Set();

function notifyListeners() { _listeners.forEach(fn => fn()); }

async function ensureLoaded(): Promise<void> {
  if (_cache !== null || _loading) return;
  _loading = true;
  try {
    // 1. Try IndexedDB first (instant, no network)
    const persisted = await idbGet<CoinEntry[]>(IDB_KEY);
    if (persisted && persisted.length > 0) {
      _cache = persisted;
      notifyListeners();
      _loading = false;
      return;
    }
    // 2. Fetch full coin list from API (~17k coins, lightweight)
    const res = await fetch("/api/coins/list");
    if (!res.ok) throw new Error("coin list fetch failed");
    const list = (await res.json()) as CoinEntry[];
    _cache = list;
    notifyListeners();
    // 3. Persist to IndexedDB for future visits
    await idbSet(IDB_KEY, list, TTL);
  } catch {
    _cache = _cache ?? [];
  } finally {
    _loading = false;
  }
}

export function useCoinIndex() {
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const notify = () => { if (mountedRef.current) setTick(t => t + 1); };
    _listeners.add(notify);
    ensureLoaded(); // idempotent — only fetches once globally
    return () => {
      mountedRef.current = false;
      _listeners.delete(notify);
    };
  }, []);

  const coins = _cache ?? [];

  /** Instant local search — runs synchronously, zero network, covers all 17k+ coins */
  const instantSearch = useCallback((query: string): CoinEntry[] => {
    if (!query || coins.length === 0) return [];
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const exact: CoinEntry[]      = [];
    const symStart: CoinEntry[]   = [];
    const nameStart: CoinEntry[]  = [];
    const contains: CoinEntry[]   = [];

    for (const c of coins) {
      const sym  = c.symbol.toLowerCase();
      const name = c.name.toLowerCase();
      if (sym === q || name === q)           { exact.push(c);     }
      else if (sym.startsWith(q))            { symStart.push(c);  }
      else if (name.startsWith(q))           { nameStart.push(c); }
      else if (sym.includes(q) || name.includes(q)) { contains.push(c); }
      if (exact.length + symStart.length + nameStart.length + contains.length >= 60) break;
    }

    return [...exact, ...symStart, ...nameStart, ...contains].slice(0, 20);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    instantSearch,
    total: coins.length,
    ready: coins.length > 0,
  };
}
