import React, { useReducer, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid, Platform } from 'react-native';
import useConnection from './use-connection';

type User = {
  id: string | number;
  name: string;
  token: string;
  [key: string]: any;
};

type AuthState = {
  user: User | null;
  loading: boolean;
};

type AuthAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'REMOVE_USER' }
  | { type: 'SET_LOADING'; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'REMOVE_USER':
      return { ...state, user: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export function useAuth() {
  const { apiClient } = useConnection();
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
  });

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log(message);
    }
  };

  const storeUser = async (user: User) => {
    try {
      await AsyncStorage.setItem('@user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to store user data', e);
    }
  };

  const auth = useMemo(
    () => ({
      login: async (name: string, password: string) => {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          const response = await apiClient.post('api/login_native', {
            name,
            password,
          });

          // console.log('Login Response:', response.data);

          if (response.data && response.data.status === 200) {
            const data = response.data;
            console.log(data)
            // Explicitly map attributes to ensure they are preserved
            const user = {
              ...(data.user || {}),
              token: data.token,
              permission: data.permission,
              // Backend appends
              role_name: data.user?.role_name,
              group_name: data.user?.group_name,
              avatar: data.user?.avatar,
            };

            // console.log('Storing user:', user);
            await storeUser(user);
            dispatch({ type: 'SET_USER', payload: user });
          } else {
            const message = response.data?.message || 'Login failed';
            showToast(message);
            dispatch({ type: 'SET_LOADING', payload: false });
            throw new Error(message);
          }
        } catch (e: any) {
          if (!e.message?.includes('Login failed')) {
            showToast(e.message || 'An error occurred');
          }
          dispatch({ type: 'SET_LOADING', payload: false });
          throw e; // Important for callers to handle
        }
      },
      logout: async () => {
        await AsyncStorage.removeItem('@user');
        dispatch({ type: 'REMOVE_USER' });
      },
      refresh: async () => {
        try {
          const userJson = await AsyncStorage.getItem('@user');
          if (!userJson) return;
          const currentUser = JSON.parse(userJson);

          const response = await apiClient.get('api/refresh', {
            params: { id: currentUser.id },
          });

          if (response.data && response.data.status === 200) {
            const data = response.data;
            const user = {
              ...(data.user || {}),
              token: data.token,
              permission: data.permission,
              // Backend appends
              role_name: data.user?.role_name,
              group_name: data.user?.group_name,
              avatar: data.user?.avatar,
            };
            await storeUser(user);
            dispatch({ type: 'SET_USER', payload: user });
          } else {
            throw new Error(response.data?.message || 'Session refresh failed');
          }
        } catch (e) {
          console.error('Failed to refresh token', e);
          throw e;
        }
      },
    }),
    [apiClient],
  );

  useEffect(() => {
    const loadSession = async () => {
      try {
        const userJson = await AsyncStorage.getItem('@user');
        if (userJson) {
          const user = JSON.parse(userJson);
          dispatch({ type: 'SET_USER', payload: user });
          // Verify/Refresh token in background
          try {
            await auth.refresh();
          } catch (e) {
            console.log('Initial refresh failed', e);
            // Optional: if refresh fails with 401, we might want to logout
            // but let the interceptor handle it on next request to avoid flashing
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (e) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    loadSession();

    // Add interceptor for 401
    const interceptor = apiClient.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            // Attempt to refresh token
            const userJson = await AsyncStorage.getItem('@user');
            if (!userJson) {
              await auth.logout();
              return Promise.reject(error);
            }
            const currentUser = JSON.parse(userJson);

            // Directly call api refresh endpoint to avoid circular dependencies if any
            // reuse logic from auth.refresh, or just call auth.refresh()
            // Since auth.refresh updates storage, subsequent requests will pick up new token
            // but for this specific retry we need to manually set the header or wait for storage?
            // Calling auth.refresh() is cleaner

            // We need to know if refresh was successful.
            // auth.refresh is currently void/async. Let's assume it throws if it fails?
            // The current implementation of refresh catches errors.
            // We should modify refresh to return boolean or throw.

            // For now, let's duplicate the critical refresh logic here or rely on auth.refresh updating valid token

            await auth.refresh();

            // Check if token actually changed?
            const newUserJson = await AsyncStorage.getItem('@user');
            const newUser = JSON.parse(newUserJson || '{}');

            if (newUser?.token && newUser.token !== currentUser.token) {
              originalRequest.headers['Authorization'] =
                `Bearer ${newUser.token}`;
              return apiClient(originalRequest);
            } else {
              throw new Error('Token refresh returned same token or failed');
            }
          } catch (refreshError) {
            await auth.logout();
            showToast('Session expired. Please login again.');
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      apiClient.interceptors.response.eject(interceptor);
    };
  }, [apiClient, auth]); // auth needs to be stable or this will re-register interceptors constantly

  return { auth, state };
}

export default useAuth;
