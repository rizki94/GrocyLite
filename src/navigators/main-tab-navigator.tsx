import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FinanceScreen } from '../screens/main/finance-screen';
import { HomeScreen } from '../screens/main/home-screen';
import { WarehouseScreen } from '../screens/main/warehouse-screen';
import { SettingsScreen } from '../screens/main/settings-screen';
import { SalesScreen } from '../screens/main/sales-screen';
import { ChatListScreen } from '../screens/chat/chat-list-screen';
import {
  Home,
  Warehouse as WarehouseIcon,
  Settings,
  DollarSign,
  Wallet,
  MessageSquare,
} from 'lucide-react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { usePermissions } from '../hooks/use-permissions';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getConversations } from '../services/chat-api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const { hasPermission } = usePermissions();
  const [totalUnread, setTotalUnread] = useState(0);

  // Poll total unread count — respect the same CS mode filter as chat-list-screen
  // so the badge only shows unread from conversations visible in the current mode
  useFocusEffect(
    React.useCallback(() => {
      const fetchUnread = async () => {
        try {
          const convs = await getConversations();

          // Read current user and CS mode state from AsyncStorage
          const userJson = await AsyncStorage.getItem('@user');
          const currentUser = userJson ? JSON.parse(userJson) : null;
          const hasCsPermission = !!currentUser?.is_cs;

          const csSaved = await AsyncStorage.getItem('@chat_cs_mode_active');
          const csFilterActive = csSaved !== null ? JSON.parse(csSaved) : true;

          // Apply same filter logic as chat-list-screen
          const isWaCustomer = (conv: (typeof convs)[0]) =>
            conv.participants?.some(p => p.username?.startsWith('wa_'));

          const visible = hasCsPermission
            ? csFilterActive
              ? convs.filter(isWaCustomer)
              : convs.filter(c => !isWaCustomer(c))
            : convs.filter(c => !isWaCustomer(c));

          const total = visible.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
          setTotalUnread(total);
        } catch (_) {}
      };

      fetchUnread();
      const interval = setInterval(fetchUnread, 8000);
      return () => clearInterval(interval);
    }, []),
  );

  const salesPermissions = [
    'approve-invoice',
    'loss-profit-report',
    'sales-return-list',
    'sales-omzet-report',
    'sales-order',
  ];

  const financePermissions = [
    'payment-ar-list',
    'payment-ap-list',
    'purchase-report',
  ];

  const warehousePermissions = ['stock-opname-list', 'product-stock-list'];
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1b1b1f' : '#fcfcfc',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#3d3d41' : '#e3e3e5',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 5,
        },
        tabBarActiveTintColor: isDark ? '#00a991' : '#5dd4bf',
        tabBarInactiveTintColor: isDark ? '#b0b0b4' : '#333337',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarLabel: t('navigate.home'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />

      {hasPermission(salesPermissions) && (
        <Tab.Screen
          name="Sales"
          component={SalesScreen}
          options={{
            tabBarLabel: t('sales.title'),
            tabBarIcon: ({ color, size }) => (
              <DollarSign size={size} color={color} />
            ),
          }}
        />
      )}

      {hasPermission(financePermissions) && (
        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            tabBarLabel: t('finance.title'),
            tabBarIcon: ({ color, size }) => (
              <Wallet size={size} color={color} />
            ),
          }}
        />
      )}

      {hasPermission(warehousePermissions) && (
        <Tab.Screen
          name="Warehouse"
          component={WarehouseScreen}
          options={{
            tabBarLabel: t('warehouse.title'),
            tabBarIcon: ({ color, size }) => (
              <WarehouseIcon size={size} color={color} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => {
            return (
              <View style={{ position: 'relative' }}>
                <MessageSquare size={size} color={color} />
                {totalUnread > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -6,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#ef4444',
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: 3,
                    }}>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: '700',
                      }}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
