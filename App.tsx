import './global.css';
import './src/lib/i18n';
import React, { useEffect } from 'react';
import { View, StatusBar, useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  DefaultTheme,
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { useAppTheme } from './src/hooks/use-app-theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AuthContext,
  ConnectionContext,
  UserContext,
} from './src/contexts/app-context';
import useAuth from './src/hooks/use-auth';
import useConnection from './src/hooks/use-connection';
import { useAutoUpdate } from './src/hooks/use-auto-update';

import { LoginScreen } from './src/screens/auth/login-screen';
import { SplashScreen } from './src/screens/splash-screen';
import { MainTabNavigator } from './src/navigators/main-tab-navigator';
import { StockOpnameScreen } from './src/screens/main/stock-opname-screen';
import { AccountScreen } from './src/screens/main/account-screen';
import { ProfitScreen } from './src/screens/sales/profit-screen';
import { SalesApproveScreen } from './src/screens/sales/sales-approve-screen';
import { ApproveDetailScreen } from './src/screens/sales/approve-detail-screen';
import { CancelTransactionScreen } from './src/screens/sales/cancel-transaction-screen';
import { SalesReportScreen } from './src/screens/sales/sales-report-screen';
import { PurchaseScreen } from './src/screens/purchase/purchase-screen';
import { SalesReturnScreen } from './src/screens/sales/sales-return-screen';
import { DebtPaymentsScreen } from './src/screens/payment/debt-payments-screen';
import { CreditPaymentsScreen } from './src/screens/payment/credit-payments-screen';
import { ServerConfigurationScreen } from './src/screens/auth/server-configuration-screen';
import { StockOpnameListScreen } from './src/screens/main/stock-opname-list-screen';
import { AttendanceScreen } from './src/screens/main/attendance-screen';
import { VisitReportScreen } from './src/screens/main/visit-report-screen';
import { AttendanceRouteScreen } from './src/screens/main/attendance-route-screen';
import { ProductsScreen } from './src/screens/main/products-screen';

const Stack = createNativeStackNavigator();

export default function App() {
  const { auth, state } = useAuth();
  const connection = useConnection();
  const { colorScheme, setColorScheme, isDark, systemScheme } = useAppTheme();
  const [isThemeReady, setIsThemeReady] = React.useState(false);
  useAutoUpdate();

  // Handle initial theme load and system theme changes manually
  useEffect(() => {
    const initTheme = async () => {
      const pref = await AsyncStorage.getItem('user-theme-preference');
      const targetTheme = pref || 'system';
      
      if (targetTheme === 'system') {
        // Resolve system theme manually and set an EXPLICIT scheme in NativeWind
        // This is often more stable on Android than letting NativeWind handle 'system'
        setColorScheme(systemScheme === 'dark' ? 'dark' : 'light');
      } else {
        setColorScheme(targetTheme as any);
      }
      setIsThemeReady(true);
    };

    initTheme();
  }, [systemScheme]); // Re-run if system scheme changes to keep 'system' preference in sync

  if (!isThemeReady) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className={isDark ? 'dark' : ''} style={{ flex: 1 }}>
          <ConnectionContext.Provider value={connection}>
            <AuthContext.Provider value={auth}>
              <UserContext.Provider value={state.user}>
                <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {state.loading ? (
                      <Stack.Screen name="Splash" component={SplashScreen} />
                    ) : state.user ? (
                      <>
                        <Stack.Screen name="Main" component={MainTabNavigator} />
                        <Stack.Screen
                          name="StockOpnameDetail"
                          component={StockOpnameScreen}
                        />
                        <Stack.Screen
                          name="AccountDetail"
                          component={AccountScreen}
                        />
                        <Stack.Screen
                          name="StockOpnameList"
                          component={StockOpnameListScreen}
                        />
                        <Stack.Screen name="Profit" component={ProfitScreen} />
                        <Stack.Screen
                          name="SalesApprove"
                          component={SalesApproveScreen}
                        />
                        <Stack.Screen
                          name="ApproveDetail"
                          component={ApproveDetailScreen}
                        />
                        <Stack.Screen
                          name="CancelTransaction"
                          component={CancelTransactionScreen}
                        />
                        <Stack.Screen
                          name="SalesReport"
                          component={SalesReportScreen}
                        />
                        <Stack.Screen name="Purchase" component={PurchaseScreen} />
                        <Stack.Screen
                          name="SalesReturn"
                          component={SalesReturnScreen}
                        />
                        <Stack.Screen
                          name="DebtPayments"
                          component={DebtPaymentsScreen}
                        />
                        <Stack.Screen
                          name="CreditPayments"
                          component={CreditPaymentsScreen}
                        />
                        <Stack.Screen
                          name="Attendance"
                          component={AttendanceScreen}
                        />
                        <Stack.Screen
                          name="VisitReport"
                          component={VisitReportScreen}
                        />
                        <Stack.Screen
                          name="AttendanceRoute"
                          component={AttendanceRouteScreen}
                        />
                        <Stack.Screen name="Products" component={ProductsScreen} />
                      </>
                    ) : (
                      <>
                        <Stack.Screen name="Auth" component={LoginScreen} />
                        <Stack.Screen
                          name="ServerConfiguration"
                          component={ServerConfigurationScreen}
                        />
                      </>
                    )}
                  </Stack.Navigator>
                </NavigationContainer>
              </UserContext.Provider>
            </AuthContext.Provider>
          </ConnectionContext.Provider>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent
          />
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
