import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/main/home-screen';
import { WarehouseScreen } from '../screens/main/warehouse-screen';
import { SettingsScreen } from '../screens/main/settings-screen';
import { SalesScreen } from '../screens/main/sales-screen';
import {
  Home,
  Warehouse as WarehouseIcon,
  Settings,
  DollarSign,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { usePermissions } from '../hooks/use-permissions';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { hasPermission } = usePermissions();

  const salesPermissions = [
    'approve-invoice',
    'loss-profit-report',
    'sales-return-list',
    'payment-ar-list',
    'payment-ap-list',
    'cancel-transaction',
  ];

  const warehousePermissions = ['stock-opname-list'];
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
          paddingTop: 10,
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
