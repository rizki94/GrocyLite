import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card, CardContent } from '../../components/ui/card';
import { useFetchWithParams, useFetch } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  Layers,
  BarChart3,
  Calendar,
  MapPin,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import { DatePicker } from '../../components/ui/date-picker';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const [date, setDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const { data: dashboardOmzet, isLoading: loadingOmzet } = useFetchWithParams(
    'api/bridge/dashboard_omzet_mobile',
    { params: { date: dateFormatted(date) } },
    date,
    refreshing,
  );

  const { data: dashboardStock, isLoading: loadingStock } = useFetch(
    'api/bridge/dashboard_stock',
    refreshing,
  );

  const { data: dashboardPurchase, isLoading: loadingPurchase } =
    useFetchWithParams(
      'api/bridge/dashboard_purchase',
      { params: { date: dateFormatted(date) } },
      date,
      refreshing,
    );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

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

  const stockTotal = Array.isArray(dashboardStock)
    ? dashboardStock.reduce(
        (prev: number, cur: any) => prev + Number(cur.Amount),
        0,
      )
    : 0;

  const purchaseTotal = Array.isArray(dashboardPurchase)
    ? dashboardPurchase.reduce(
        (prev: number, cur: any) => prev + Number(cur.Amount),
        0,
      )
    : 0;

  return (
    <AppLayout title={t('dashboard.home')}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {/* Date Selector */}
        <View className="mb-6">
          <DatePicker value={date} onChange={setDate} />
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-8">
          <Pressable
            className="w-[48%] mb-4"
            onPress={() => navigation.navigate('SalesReport' as never)}
          >
            <View className="p-4 rounded-2xl border border-primary/30 bg-primary/5">
              <View className="p-2 rounded-xl bg-primary/10 w-10 h-10 items-center justify-center mb-3">
                <TrendingUp size={20} color={colors.primary} />
              </View>
              <Text className="text-xl font-black text-foreground">
                {numberWithComma(omzetStats.today)}
              </Text>
              <Text className="text-[10px] text-muted-foreground font-extrabold uppercase mt-1">
                {t('dashboard.todayOmzet')}
              </Text>
              <Text
                className={cn(
                  'text-[10px] mt-2 font-bold',
                  omzetStats.percentage >= 0
                    ? 'text-emerald-500'
                    : 'text-destructive',
                )}
              >
                {omzetStats.percentage >= 0 ? '+' : ''}
                {omzetStats.percentage.toFixed(1)}% vs {t('general.lastWeek')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            className="w-[48%] mb-4"
            onPress={() => navigation.navigate('Warehouse' as never)}
          >
            <View className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
              <View className="p-2 rounded-xl bg-amber-500/10 w-10 h-10 items-center justify-center mb-3">
                <Package size={20} color={colors.amber} />
              </View>
              <Text className="text-xl font-black text-foreground">
                {numberWithComma(stockTotal)}
              </Text>
              <Text className="text-[10px] text-muted-foreground font-extrabold uppercase mt-1">
                {t('dashboard.totalStock')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            className="w-[100%]"
            onPress={() => navigation.navigate('Purchase' as never)}
          >
            <View className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5">
              <View className="flex-row items-center justify-between">
                <View>
                  <View className="p-2 rounded-xl bg-blue-500/10 w-10 h-10 items-center justify-center mb-3">
                    <BarChart3 size={20} color={colors.blue} />
                  </View>
                  <Text className="text-xl font-black text-foreground">
                    {numberWithComma(purchaseTotal)}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground font-extrabold uppercase mt-1">
                    {t('dashboard.totalPurchasing')}
                  </Text>
                </View>
                <ArrowRight
                  size={24}
                  color={colors.blue}
                  style={{ opacity: 0.3 }}
                />
              </View>
            </View>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <Text className="text-lg font-bold text-foreground mb-4">
          {t('dashboard.quickActions')}
        </Text>
        <View className="flex-row gap-4 mb-4">
          <Pressable
            onPress={() => navigation.navigate('Attendance' as never)}
            className="flex-1 bg-primary p-4 rounded-2xl items-center justify-center shadow-lg active:opacity-80"
          >
            <MapPin size={24} color={colors.primaryForeground} />
            <Text className="text-primary-foreground font-medium">
              {t('dashboard.attendance')}
            </Text>
          </Pressable>
        </View>
        {/* <View className="flex-row gap-4 mb-8">
          <Pressable className="flex-1 bg-primary p-4 rounded-2xl items-center justify-center shadow-lg active:opacity-80">
            <Plus size={24} color="#ffffff" />
            <Text className="text-primary-foreground font-medium">
              {t('dashboard.addStock')}
            </Text>
          </Pressable>
          <Pressable className="flex-1 bg-card border border-border p-4 rounded-2xl items-center justify-center active:opacity-80">
            <Layers size={24} color={colors.foreground} />
            <Text className="text-foreground font-medium">
              {t('dashboard.scanQr')}
            </Text>
          </Pressable>
        </View> */}

        {/* Stock Breakdown (if exists) */}
        {Array.isArray(dashboardStock) && dashboardStock.length > 0 && (
          <>
            <Text className="text-lg font-bold text-foreground mb-4">
              {t('dashboard.stockBreakdown')}
            </Text>
            {/* Stock Breakdown */}
            {Array.isArray(dashboardStock) && dashboardStock.length > 0 && (
              <View className="mb-10">
                <Text className="text-lg font-bold text-foreground mb-4">
                  {t('dashboard.stockBreakdown')}
                </Text>
                <View className="bg-secondary/10 rounded-2xl border border-border/50 p-4">
                  {dashboardStock.map((item: any, i: number) => (
                    <View
                      key={i}
                      className={cn(
                        'flex-row items-center justify-between py-4',
                        i !== dashboardStock.length - 1 &&
                          'border-b border-border/30',
                      )}
                    >
                      <Text className="font-extrabold text-foreground uppercase text-xs">
                        {item.Source}
                      </Text>
                      <Text className="font-black text-primary text-base">
                        {numberWithComma(item.Amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
}
