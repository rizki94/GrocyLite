import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useFetchWithParams, useFetch } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import {
  Package,
  TrendingUp,
  ArrowRight,
  BarChart3,
  MapPin,
  RotateCcw,
  Ban,
  RefreshCw,
  Cloud,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { DatePicker } from '../../components/ui/date-picker';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import { usePermissions } from '../../hooks/use-permissions';

import { useOffline } from '../../hooks/use-offline';

export function HomeScreen() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const { isOffline, queue, processQueue, isSyncing } = useOffline();

  const {
    data: dashboardOmzet,
    isLoading: loadingOmzet,
    fetchError: errorOmzet,
  } = useFetchWithParams(
    'api/bridge/dashboard_omzet_mobile',
    { params: { date: dateFormatted(date) } },
    [date],
    refreshing,
  );

  const {
    data: dashboardPurchase,
    isLoading: loadingPurchase,
    fetchError: errorPurchase,
  } = useFetchWithParams(
    'api/bridge/dashboard_purchase',
    { params: { date: dateFormatted(date) } },
    [date],
    refreshing,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const isLoading = loadingOmzet || loadingPurchase;
  const fetchError = errorOmzet || errorPurchase;

  const hasNoData =
    (!dashboardOmzet || dashboardOmzet.length === 0) &&
    (!dashboardPurchase || dashboardPurchase.length === 0);

  const getOmzetStats = () => {
    let today = 0;
    let lastWeek = 0;
    let percentage = 0;

    if (Array.isArray(dashboardOmzet) && dashboardOmzet.length > 0) {
      today = dashboardOmzet
        .filter((item: any) => item.Date === 'TODAY')
        .reduce((prev: number, cur: any) => prev + Number(cur.Amount), 0);

      lastWeek = dashboardOmzet
        .filter((item: any) => item.Date === 'LASTWEEK')
        .reduce((prev: number, cur: any) => prev + Number(cur.Amount), 0);

      if (lastWeek > 0) {
        percentage = ((today - lastWeek) / lastWeek) * 100;
      }
    }
    return { today, percentage };
  };

  const omzetStats = getOmzetStats();

  const purchaseTotal = Array.isArray(dashboardPurchase)
    ? dashboardPurchase.reduce(
      (prev: number, cur: any) => prev + Number(cur.Amount),
      0,
    )
    : 0;

  return (
    <View
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View className="bg-card border-b border-border shadow-sm">
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-2xl font-black text-foreground tracking-tighter">
            {t('dashboard.home')}
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 bg-secondary/20 rounded-full"
          >
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Date Selector */}
        <View className="mb-6">
          <DatePicker value={date} onChange={setDate} />
        </View>

        {/* Offline Banner */}
        {isOffline && (
          <View className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl">
            <Text className="text-orange-600 font-bold text-sm text-center">
              📡 {t('element.offline') || 'Offline Mode'} - {t('element.showingCachedData') || 'Showing cached data'}
            </Text>
          </View>
        )}

        {/* Sync Queue Banner */}
        {!isOffline && queue.length > 0 && (
          <TouchableOpacity
            onPress={() => processQueue()}
            disabled={isSyncing}
            className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-2xl flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="mr-3">
                <Cloud size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-primary font-bold text-sm">
                  {t('element.pendingActions')} ({queue.length})
                </Text>
                <Text className="text-primary/60 text-[10px] uppercase font-bold tracking-tighter">
                  {isSyncing ? 'Syncing...' : t('element.syncNow')}
                </Text>
              </View>
            </View>
            <View className={isSyncing ? 'animate-spin' : ''}>
              <RefreshCw
                size={18}
                color={colors.primary}
              />
            </View>
          </TouchableOpacity>
        )}

        {fetchError && hasNoData && !isOffline ? (
          <ConnectionError onRetry={onRefresh} message={fetchError} />
        ) : (
          <>
            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between mb-8">
              {/* Omzet Card */}
              <Pressable
                className="w-[100%] mb-4"
                onPress={() => navigation.navigate('SalesReport' as never)}
              >
                <View className="p-4 rounded-3xl border border-primary/30 bg-primary/5">
                  <View className="p-2 rounded-2xl bg-primary/10 w-10 h-10 items-center justify-center mb-3">
                    <TrendingUp size={20} color={colors.primary} />
                  </View>
                  <Text className="text-xl font-black text-foreground tracking-tight">
                    {numberWithComma(omzetStats.today)}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                    {t('dashboard.todayOmzet')}
                  </Text>
                  <View
                    className={cn(
                      'mt-3 px-2 py-1 rounded-lg self-start',
                      omzetStats.percentage >= 0
                        ? 'bg-emerald-500/10'
                        : 'bg-destructive/10',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-[10px] font-black',
                        omzetStats.percentage >= 0
                          ? 'text-emerald-500'
                          : 'text-destructive',
                      )}
                    >
                      {omzetStats.percentage >= 0 ? '+' : ''}
                      {omzetStats.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </Pressable>

              {hasPermission('purchase-report') && (
                <Pressable
                  className="w-[100%]"
                  onPress={() => navigation.navigate('Purchase' as never)}
                >
                  <View className="p-4 rounded-3xl border border-blue-500/30 bg-blue-500/5">
                    <View className="flex-row items-center justify-between">
                      <View>
                        <View className="p-2 rounded-2xl bg-blue-500/10 w-10 h-10 items-center justify-center mb-3">
                          <BarChart3 size={20} color={colors.blue} />
                        </View>
                        <Text className="text-2xl font-black text-foreground tracking-tight">
                          {numberWithComma(purchaseTotal)}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                          {t('dashboard.totalPurchasing')}
                        </Text>
                      </View>
                      <View className="bg-blue-500/10 p-3 rounded-2xl">
                        <ArrowRight size={20} color={colors.blue} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Quick Actions */}
            <Text className="text-xs font-black text-muted-foreground uppercase tracking-[3px] mb-4 ml-1">
              {t('dashboard.quickActions')}
            </Text>
            <View className="flex-row gap-4 mb-8">
              <Pressable
                onPress={() => navigation.navigate('Attendance' as never)}
                className="flex-1 bg-primary p-5 rounded-3xl items-center flex-row justify-center shadow-lg shadow-primary/30 active:opacity-90"
              >
                <MapPin size={20} color={colors.primaryForeground} />
                <Text className="text-primary-foreground font-black uppercase tracking-widest ml-3 text-xs">
                  {t('dashboard.attendance')}
                </Text>
              </Pressable>
            </View>

            {/* Management Actions */}
            {hasPermission('cancel-transaction') && (
              <View className="mb-8">
                <Text className="text-xs font-black text-muted-foreground uppercase tracking-[3px] mb-4 ml-1">
                  Management
                </Text>
                <Pressable
                  onPress={() =>
                    navigation.navigate('CancelTransaction' as never)
                  }
                  className="bg-card border border-border p-5 rounded-3xl items-center flex-row justify-center active:bg-secondary/20 shadow-sm"
                >
                  <Ban size={20} color={colors.destructive} />
                  <Text className="text-destructive font-black uppercase tracking-widest ml-3 text-xs">
                    {t('cancelTransaction.title')}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <Loading isLoading={isLoading} />
    </View>
  );
}
