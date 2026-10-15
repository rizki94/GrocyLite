import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnection } from './use-connection';
import { MarketplaceTransactionItem } from '../screens/main/resi-scan-screen';

/**
 * Cache key per date — e.g. "@resi_scan_2026-10-15"
 * Keeps the last 3 dates to avoid stale storage growing indefinitely.
 */
const CACHE_PREFIX = '@resi_scan_';
const CACHE_META_KEY = '@resi_scan_dates'; // tracks which dates are cached

function buildCacheKey(dateStr: string) {
  return `${CACHE_PREFIX}${dateStr}`;
}

export interface ResiScanCache {
  data: MarketplaceTransactionItem[];
  fetchedAt: number; // epoch ms
  date: string;      // 'YYYY-MM-DD'
}

export function useResiScanCache() {
  const { apiClient } = useConnection();

  const [allTransactions, setAllTransactions] = useState<MarketplaceTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [lastFetchedDate, setLastFetchedDate] = useState<string | null>(null);

  // Prevent concurrent fetches for the same request
  const isFetchingRef = useRef(false);

  // ── Read from AsyncStorage ──────────────────────────────────────────────────
  const loadFromCache = useCallback(async (dateStr: string): Promise<ResiScanCache | null> => {
    try {
      const raw = await AsyncStorage.getItem(buildCacheKey(dateStr));
      if (!raw) return null;
      return JSON.parse(raw) as ResiScanCache;
    } catch (e) {
      console.warn('[ResiScanCache] Failed to read cache:', e);
      return null;
    }
  }, []);

  // ── Write to AsyncStorage ───────────────────────────────────────────────────
  const saveToCache = useCallback(async (dateStr: string, data: MarketplaceTransactionItem[]) => {
    try {
      const payload: ResiScanCache = { data, fetchedAt: Date.now(), date: dateStr };
      await AsyncStorage.setItem(buildCacheKey(dateStr), JSON.stringify(payload));

      // Track cached dates, keep last 3
      const metaRaw = await AsyncStorage.getItem(CACHE_META_KEY);
      let dates: string[] = metaRaw ? JSON.parse(metaRaw) : [];
      dates = [dateStr, ...dates.filter((d) => d !== dateStr)].slice(0, 3);
      await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify(dates));

      // Purge stale keys not in the kept dates list
      const allKeys = await AsyncStorage.getAllKeys();
      const staleKeys = allKeys.filter(
        (k) => k.startsWith(CACHE_PREFIX) && !dates.includes(k.replace(CACHE_PREFIX, ''))
      );
      if (staleKeys.length > 0) {
        await AsyncStorage.multiRemove(staleKeys);
      }
    } catch (e) {
      console.warn('[ResiScanCache] Failed to write cache:', e);
    }
  }, []);

  // ── Fetch full day data from server (no checked-status filter) ──────────────
  // All filtering (courier, sudah_dicek, search) is done CLIENT-SIDE
  // so counts are always stable — they're computed from the same full dataset.
  const fetchFromServer = useCallback(
    async (dateStr: string): Promise<MarketplaceTransactionItem[]> => {
      const response = await apiClient.get('api/online/bridge/transactions/scan-list', {
        params: {
          date: dateStr,
          per_page: 2000, // full daily batch
        },
      });
      return (response.data?.data || []) as MarketplaceTransactionItem[];
    },
    [apiClient]
  );

  /**
   * Main sync function.
   *
   * isRefresh = false (page enter / date change):
   *   → Show cached data instantly, then silently refresh in BG if stale (>5 min)
   *
   * isRefresh = true (pull-to-refresh / manual):
   *   → Always fetch from server regardless of cache age
   */
  const syncTransactions = useCallback(
    async (dateStr: string, isRefresh: boolean = false) => {
      if (isFetchingRef.current && !isRefresh) return;
      isFetchingRef.current = true;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        if (!isRefresh) {
          // 1. Serve cached data immediately for instant UI
          const cached = await loadFromCache(dateStr);
          if (cached && cached.data.length > 0) {
            setAllTransactions(cached.data);
            setLastFetchedAt(cached.fetchedAt);
            setLastFetchedDate(cached.date);
            setIsLoading(false);

            // 2. Skip network if cache is fresh (< 5 min)
            const ageMs = Date.now() - cached.fetchedAt;
            const STALE_MS = 5 * 60 * 1000;
            if (ageMs < STALE_MS) {
              isFetchingRef.current = false;
              return;
            }
            // Otherwise fall through to background refresh
          }
        }

        // 3. Network fetch
        const fresh = await fetchFromServer(dateStr);
        setAllTransactions(fresh);
        const now = Date.now();
        setLastFetchedAt(now);
        setLastFetchedDate(dateStr);

        // 4. Persist to cache
        await saveToCache(dateStr, fresh);
      } catch (err: any) {
        console.error('[ResiScanCache] Sync failed:', err);
        // Keep existing in-memory data on failure — don't wipe what the user sees
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [loadFromCache, fetchFromServer, saveToCache]
  );

  /**
   * Optimistically update a single item in local state + cache.
   * Use after mark-checked / cancel so the UI reflects the change
   * immediately without a full network refetch.
   */
  const updateItemLocally = useCallback(
    (
      predicate: (item: MarketplaceTransactionItem) => boolean,
      updater: (item: MarketplaceTransactionItem) => MarketplaceTransactionItem
    ) => {
      setAllTransactions((prev) => {
        const next = prev.map((item) => (predicate(item) ? updater(item) : item));
        // Persist updated list to cache (fire and forget)
        if (lastFetchedDate) {
          saveToCache(lastFetchedDate, next).catch(() => {});
        }
        return next;
      });
    },
    [lastFetchedDate, saveToCache]
  );

  /**
   * Mark matching items as cancelled locally (optimistic update for quick-cancel).
   */
  const markCancelledLocally = useCallback(
    (identifiers: string[]) => {
      const idSet = new Set(identifiers.map((s) => s.toUpperCase()));
      updateItemLocally(
        (item) =>
          idSet.has((item.tracking_number || '').toUpperCase()) ||
          idSet.has((item.marketplace_invoice || '').toUpperCase()) ||
          idSet.has((item.local_invoice || '').toUpperCase()),
        (item) => ({ ...item, status: 'cancelled' })
      );
    },
    [updateItemLocally]
  );

  return {
    allTransactions,
    isLoading,
    isRefreshing,
    lastFetchedAt,
    syncTransactions,
    updateItemLocally,
    markCancelledLocally,
  };
}
