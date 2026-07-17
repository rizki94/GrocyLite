import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnection } from './use-connection';
import NetInfo from '@react-native-community/netinfo';

export interface Customer {
  id: string | null;
  name: string;
  price_type: string;
  address: string;
  term_top: number;
  credit_limit: number;
  source: 'PKP' | 'NON';
  non_id: string | null;
}

export interface Product {
  pkey: string;
  name: string;
  source: 'PKP' | 'NON' | 'BOTH';
  unit1: string | null;
  unit2: string | null;
  unit3: string | null;
  rat1: number;
  rat2: number;
  rat3: number;
  rat4: number;
  weight1: number;
  weight2: number;
  weight3: number;
  volume1: number;
  volume2: number;
  volume3: number;
  price_a1: number;
  price_a2: number;
  price_a3: number;
  price_b1: number;
  price_b2: number;
  price_b3: number;
  price_c1: number;
  price_c2: number;
  price_c3: number;
  price_d1: number;
  price_d2: number;
  price_d3: number;
  price_e1: number;
  price_e2: number;
  price_e3: number;
  price_p1: number;
  price_p2: number;
  price_p3: number;
}

export interface Salesman {
  IdSalesman: number | string;
  Descr: string;
}

const CUSTOMERS_CACHE_KEY = '@so_customers_cache';
const PRODUCTS_CACHE_KEY = '@so_products_cache';
const SALESMEN_CACHE_KEY = '@so_salesmen_cache';
const TIMESTAMP_CACHE_KEY = '@so_cache_timestamp';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function useSalesOrderCache() {
  const { apiClient } = useConnection();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Load from AsyncStorage
  const loadCache = useCallback(async () => {
    try {
      const cachedCust = await AsyncStorage.getItem(CUSTOMERS_CACHE_KEY);
      const cachedProd = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      const cachedSales = await AsyncStorage.getItem(SALESMEN_CACHE_KEY);
      const cachedTime = await AsyncStorage.getItem(TIMESTAMP_CACHE_KEY);

      if (cachedCust) setCustomers(JSON.parse(cachedCust));
      if (cachedProd) setProducts(JSON.parse(cachedProd));
      if (cachedSales) setSalesmen(JSON.parse(cachedSales));
      if (cachedTime) {
        const ts = Number(cachedTime);
        setLastUpdated(ts);
        return ts;
      }
    } catch (e) {
      console.error('Failed to load Sales Order cache from storage', e);
    }
    return null;
  }, []);

  // Fetch from server and update local cache
  const refreshCache = useCallback(async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('No internet connection. Cannot update cache.');
    }

    setIsLoading(true);
    try {
      const [custRes, prodRes, salesRes] = await Promise.all([
        apiClient.get('api/sales_order/customers'),
        apiClient.get('api/sales_order/products'),
        apiClient.get('api/sales_order/salesmen'),
      ]);

      const now = Date.now();

      await AsyncStorage.setItem(
        CUSTOMERS_CACHE_KEY,
        JSON.stringify(custRes.data),
      );
      await AsyncStorage.setItem(
        PRODUCTS_CACHE_KEY,
        JSON.stringify(prodRes.data),
      );
      await AsyncStorage.setItem(
        SALESMEN_CACHE_KEY,
        JSON.stringify(salesRes.data),
      );
      await AsyncStorage.setItem(TIMESTAMP_CACHE_KEY, now.toString());

      setCustomers(custRes.data);
      setProducts(prodRes.data);
      setSalesmen(salesRes.data);
      setLastUpdated(now);
    } catch (e) {
      console.error('Failed to refresh Sales Order cache', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  // Initial load or auto-refresh
  useEffect(() => {
    const init = async () => {
      const ts = await loadCache();
      const now = Date.now();
      const isExpired = !ts || now - ts > CACHE_TTL;

      if (isExpired) {
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          try {
            await refreshCache();
          } catch (err) {
            console.log(
              'Auto-cache refresh failed. Using old cache if available.',
            );
          }
        }
      }
    };
    init();
  }, [loadCache, refreshCache]);

  return {
    customers,
    products,
    salesmen,
    isLoading,
    lastUpdated,
    refreshCache,
  };
}
