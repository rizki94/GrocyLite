import { useEffect, useState } from 'react';
import useConnection from './use-connection';
import { AxiosRequestConfig } from 'axios';

export function useFetch<T = any>(
  url: string,
  params?: any,
  params2?: any,
  params3?: any,
) {
  const { apiClient } = useConnection();
  const [data, setData] = useState<T>([] as any);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [refreshCount, setRefreshCount] = useState(0);
  const refetch = () => setRefreshCount(prev => prev + 1);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(url);
        if (isMounted) {
          setData(response.data);
          setFetchError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err.message || 'Network Error');
          setData([] as any);
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
  const [data, setData] = useState<T>([] as any);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [refreshCount, setRefreshCount] = useState(0);
  const refetch = () => setRefreshCount(prev => prev + 1);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(url, options);
        if (isMounted) {
          setData(response.data);
          setFetchError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err.message || 'Network Error');
          setData([] as any);
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
  ]);

  return { data, setData, isLoading, fetchError, refetch };
}
