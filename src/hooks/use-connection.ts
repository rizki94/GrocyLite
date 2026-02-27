import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';

const DEFAULT_URL = 'http://[IP_ADDRESS]';

export const apiClient = axios.create({
  withCredentials: true,
});

apiClient.interceptors.request.use(
  async config => {
    const userJson = await AsyncStorage.getItem('@user');
    const user = userJson ? JSON.parse(userJson) : null;

    const localUrl = await AsyncStorage.getItem('@url');
    config.baseURL = localUrl || DEFAULT_URL;

    if (user?.token) {
      config.headers['Authorization'] = `Bearer ${user.token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

export function useConnection() {
  const [url, setUrl] = useState(DEFAULT_URL);

  const fetchUrl = async () => {
    try {
      const localUrl = await AsyncStorage.getItem('@url');
      if (localUrl) {
        setUrl(localUrl);
      }
    } catch (e) {
      console.error('Failed to fetch connection URL', e);
    }
  };

  useEffect(() => {
    fetchUrl();
  }, []);

  const updateUrl = async (newUrl: string) => {
    await AsyncStorage.setItem('@url', newUrl);
    setUrl(newUrl);
  };

  return { url, setUrl: updateUrl, apiClient, defaultUrl: DEFAULT_URL };
}

export default useConnection;
