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

          if (response.status === 200 || response.data.status === 200) {
            const data = response.data;
            const user = {
              ...data.user,
              token: data.token,
              permission: data.permission,
            };
            await storeUser(user);
            dispatch({ type: 'SET_USER', payload: user });
          } else {
            showToast(response.data.message || 'Login failed');
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } catch (e: any) {
          showToast(e.message || 'An error occurred');
          dispatch({ type: 'SET_LOADING', payload: false });
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

          if (response.data.status === 200) {
            const user = {
              ...response.data.user,
              token: response.data.token,
              permission: response.data.permission,
            };
            await storeUser(user);
            dispatch({ type: 'SET_USER', payload: user });
          }
        } catch (e) {
          console.error('Failed to refresh token', e);
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
          dispatch({ type: 'SET_USER', payload: JSON.parse(userJson) });
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
        if (error.response?.status === 401) {
          await auth.logout();
          showToast('Session expired. Please login again.');
        }
        return Promise.reject(error);
      },
    );

    return () => {
      apiClient.interceptors.response.eject(interceptor);
    };
  }, [apiClient, auth]);

  return { auth, state };
}

export default useAuth;
