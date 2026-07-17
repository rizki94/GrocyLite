import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import uuid from 'react-native-uuid';
import { Alert } from 'react-native';
import { useConnection } from './use-connection';
import { Customer } from './use-sales-order-cache';

export interface DraftItem {
  pkey: string;
  source: 'PKP' | 'NON' | 'BOTH';
  name: string;
  unit: number; // 1, 2, 3
  unitName: string;
  ratio: number;
  qty: number;
  price: number;
  discount: number; // fixed amount per item, after tax
  cos: number;
  weight: number;
  volume: number;
}

export interface SalesOrderDraft {
  id: string;
  date: string;
  customer: Customer;
  salesman: {
    id: number | string;
    name: string;
  };
  memo: string;
  items: DraftItem[];
  total: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  error?: string;
  createdAt: number;
}

const DRAFTS_STORAGE_KEY = '@sales_order_drafts';

export function useSalesOrderDrafts() {
  const { apiClient } = useConnection();
  const [drafts, setDrafts] = useState<SalesOrderDraft[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const prevIsOfflineRef = useRef(true);

  // Load drafts
  const loadDrafts = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      if (stored) {
        setDrafts(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load Sales Order drafts', e);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Save new or update existing draft
  const saveDraft = useCallback(async (draftData: Omit<SalesOrderDraft, 'id' | 'createdAt' | 'status'> & { id?: string }) => {
    try {
      const stored = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      const currentDrafts: SalesOrderDraft[] = stored ? JSON.parse(stored) : [];

      const newDraft: SalesOrderDraft = {
        ...draftData,
        id: draftData.id || uuid.v4().toString(),
        createdAt: Date.now(),
        status: 'PENDING',
      };

      const existsIndex = currentDrafts.findIndex(d => d.id === newDraft.id);
      if (existsIndex > -1) {
        currentDrafts[existsIndex] = newDraft;
      } else {
        currentDrafts.unshift(newDraft);
      }

      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(currentDrafts));
      setDrafts(currentDrafts);
      return newDraft;
    } catch (e) {
      console.error('Failed to save Sales Order draft', e);
      throw e;
    }
  }, []);

  // Delete draft
  const deleteDraft = useCallback(async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      if (stored) {
        const currentDrafts: SalesOrderDraft[] = JSON.parse(stored);
        const filtered = currentDrafts.filter(d => d.id !== id);
        await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(filtered));
        setDrafts(filtered);
      }
    } catch (e) {
      console.error('Failed to delete draft', e);
    }
  }, []);

  // Sync a single draft
  const syncDraft = useCallback(async (id: string) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('No internet connection. Cannot sync.');
    }

    const stored = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!stored) return;

    const currentDrafts: SalesOrderDraft[] = JSON.parse(stored);
    const draftIndex = currentDrafts.findIndex(d => d.id === id);
    if (draftIndex === -1) return;

    const draft = currentDrafts[draftIndex];
    draft.status = 'SYNCING';
    setDrafts([...currentDrafts]);

    try {
      const res = await apiClient.post('api/sales_order/sync', {
        date: draft.date,
        customer: draft.customer,
        salesman: draft.salesman,
        memo: draft.memo,
        items: draft.items.map(item => ({
          pkey: item.pkey,
          source: item.source === 'BOTH' ? 'PKP' : item.source, // Map BOTH to PKP or NON appropriately
          name: item.name,
          unit: item.unit,
          ratio: item.ratio,
          qty: item.qty,
          price: item.price,
          discount: item.discount,
          cos: item.cos,
          weight: item.weight,
          volume: item.volume,
        })),
      });

      if (res.data.status === 200) {
        // Remove or mark as synced. Let's delete/remove synced drafts to keep storage clean,
        // or just filter it out.
        const updated = currentDrafts.filter(d => d.id !== id);
        await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updated));
        setDrafts(updated);
        return res.data;
      } else {
        throw new Error(res.data.message || 'Sync failed');
      }
    } catch (e: any) {
      console.error('Sync failed for draft ' + id, e);
      draft.status = 'FAILED';
      draft.error = e.response?.data?.message || e.message || 'Unknown error';
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(currentDrafts));
      setDrafts([...currentDrafts]);
      throw e;
    }
  }, [apiClient]);

  // Sync all pending drafts
  const syncAllPending = useCallback(async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || isSyncing) return;

    setIsSyncing(true);
    try {
      const stored = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      if (!stored) {
        setIsSyncing(false);
        return;
      }

      const currentDrafts: SalesOrderDraft[] = JSON.parse(stored);
      const pending = currentDrafts.filter(d => d.status === 'PENDING' || d.status === 'FAILED');

      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      for (const draft of pending) {
        try {
          await syncDraft(draft.id);
          successCount++;
        } catch (err) {
          console.error('Failed to sync pending draft', draft.id, err);
        }
      }

      if (successCount > 0) {
        Alert.alert('Sync Status', `Successfully synced ${successCount} Sales Order(s).`);
      }
    } catch (e) {
      console.error('Error syncing all pending', e);
    } finally {
      setIsSyncing(false);
    }
  }, [syncDraft, isSyncing]);

  // Listen to NetInfo to auto-sync when online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = prevIsOfflineRef.current;
      const isNowOnline = state.isConnected === true;
      prevIsOfflineRef.current = !isNowOnline;

      if (wasOffline && isNowOnline) {
        syncAllPending();
      }
    });

    return () => unsubscribe();
  }, [syncAllPending]);

  return {
    drafts,
    isSyncing,
    saveDraft,
    deleteDraft,
    syncDraft,
    syncAllPending,
  };
}
