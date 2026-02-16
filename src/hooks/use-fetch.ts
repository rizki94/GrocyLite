import { useEffect, useState } from 'react';
import useConnection from './use-connection';
import { AxiosRequestConfig } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useFetch<T = any>(
  url: string,
  params?: any,
  params2?: any,
  params3?: any,
) {
  const { apiClient } = useConnection();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [data, setData] = useState<T>([] as any);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [refreshCount, setRefreshCount] = useState(0);
  const refetch = () => setRefreshCount(prev => prev + 1);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      const cacheKey = `cache:${url}:${JSON.stringify(params)}:${JSON.stringify(params2)}:${JSON.stringify(params3)}`;

      try {
        if (isConnected === false) {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached && isMounted) {
            setData(JSON.parse(cached));
            setIsLoading(false);
            return;
          }
        }

        const response = await apiClient.get(url);
        if (isMounted) {
          setData(response.data);
          setFetchError(null);
          AsyncStorage.setItem(cacheKey, JSON.stringify(response.data));
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Fetch error, trying cache', err);
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            setData(JSON.parse(cached));
          } else {
            setFetchError(err.message || 'Network Error');
            setData([] as any);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [
    url,
    JSON.stringify(params),
    JSON.stringify(params2),
    JSON.stringify(params3),
    refreshCount,
    isConnected,
  ]);

  return { data, setData, isLoading, fetchError, refetch };
}

export function useFetchWithParams<T = any>(
  url: string,
  options: AxiosRequestConfig,
  params?: any,
  params2?: any,
  params3?: any,
) {
  const { apiClient } = useConnection();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [data, setData] = useState<T>([] as any);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [refreshCount, setRefreshCount] = useState(0);
  const refetch = () => setRefreshCount(prev => prev + 1);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      const cacheKey = `cache:${url}:${JSON.stringify(options)}:${JSON.stringify(params)}:${JSON.stringify(params2)}:${JSON.stringify(params3)}`;

      try {
        if (isConnected === false) {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached && isMounted) {
            setData(JSON.parse(cached));
            setIsLoading(false);
            return;
          }
        }

        const response = await apiClient.get(url, options);
        if (isMounted) {
          setData(response.data);
          setFetchError(null);
          AsyncStorage.setItem(cacheKey, JSON.stringify(response.data));
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Fetch error, trying cache', err);
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            setData(JSON.parse(cached));
          } else {
            setFetchError(err.message || 'Network Error');
            setData([] as any);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [
    url,
    JSON.stringify(options),
    JSON.stringify(params),
    JSON.stringify(params2),
    JSON.stringify(params3),
    refreshCount,
    isConnected,
  ]);

  return { data, setData, isLoading, fetchError, refetch };
}
