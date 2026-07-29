import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatUser {
  id: string | number;
  name: string;
  full_name?: string;
  username?: string;
  avatar_img?: string;
  token?: string;
}

export function useChatUser() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const userJson = await AsyncStorage.getItem('@user');
        if (userJson) {
          const parsed = JSON.parse(userJson);
          setCurrentUser(parsed);
        }
      } catch (e) {
        console.error('Failed to load user from AsyncStorage', e);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  return { currentUser, loading };
}
