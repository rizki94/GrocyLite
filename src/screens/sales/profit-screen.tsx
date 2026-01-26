import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Switch,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import {
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Users,
  Map as MapIcon,
  DollarSign,
} from 'lucide-react-native';
import { DatePicker } from '../../components/ui/date-picker';
import { Card } from '../../components/ui/card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading } from '../../components/ui/loading';
import { useTranslation } from 'react-i18next';

interface ProfitItem {
  Salesman: string;
  Amount: number;
  Weight: number;
  Volume: number;
  Count: number;
  HPP: number;
  Profit: number;
  [key: string]: any;
}

const StatCard = ({ label, value, subValue, icon: Icon, color }: any) => (
  <Card className="p-4 bg-card border border-border min-w-[150px]">
    <View className="flex-row items-center justify-between mb-2">
      <View
        className="p-2 rounded-full"
        style={{ backgroundColor: color + '20' }}
      >
        <Icon size={16} color={color} />
      </View>
    </View>
    <Text className="text-xs text-muted-foreground font-medium mb-1">
      {label}
    </Text>
    <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
      {value}
    </Text>
    {subValue && (
      <Text className="text-[10px] mt-1" style={{ color: color }}>
        {subValue}
      </Text>
    )}
  </Card>
);

export function ProfitScreen({ navigation: propNavigation }: any) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [release, setRelease] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'salesman' | 'route'>('salesman');
  const [isChangingTab, setIsChangingTab] = useState(false);

  const handleTabChange = (tab: 'salesman' | 'route') => {
    if (tab === activeTab) return;
    setIsChangingTab(true);
    setActiveTab(tab);
    setTimeout(() => setIsChangingTab(false), 500);
  };

  const filters = useMemo(
    () => ({
      startDate: dateFormatted(startDate),
      endDate: dateFormatted(endDate),
      release: release,
    }),
    [startDate, endDate, release],
  );

  const { data: omzetData, isLoading: loadingOmzet } = useFetchWithParams(
    'api/bridge/laba_rugi',
    { params: filters },
    filters,
    refreshing,
  );

  const { data: routeData, isLoading: loadingRoute } = useFetchWithParams(
    'api/bridge/laba_rugi_by_route',
    { params: filters },
    filters,
    refreshing,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const omzets = useMemo(() => {
    return Array.isArray(omzetData)
      ? omzetData
      : Object.values(omzetData || {});
  }, [omzetData]);

  const routeOmzets = useMemo(() => {
    return Array.isArray(routeData)
      ? routeData
      : Object.values(routeData || {});
  }, [routeData]);

  const displayedData = useMemo(() => {
    return activeTab === 'salesman' ? omzets : routeOmzets;
  }, [activeTab, omzets, routeOmzets]);

  const activeTabStyle = {
    backgroundColor: colors.card,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  };

  const summary = useMemo(() => {
    const data = omzets;
    const totalSales = data.reduce(
      (acc, curr) => acc + (Number(curr.Amount) || 0),
      0,
    );
    const totalProfit = data.reduce(
      (acc, curr) => acc + (Number(curr.Profit) || 0),
      0,
    );
    const totalHPP = data.reduce(
      (acc, curr) => acc + (Number(curr.HPP) || 0),
      0,
    );
    const margin = totalHPP > 0 ? (totalProfit / totalHPP) * 100 : 0;

    return { totalSales, totalProfit, margin, count: data.length };
  }, [omzets]);

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={['top', 'left', 'right']}
    >
      {/* Sticky Header Section */}
      <View className="bg-card border-b border-border shadow-sm z-10">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="p-2 -ml-2 rounded-full active:bg-secondary/20"
            >
              <ArrowLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground ml-2">
              {t('sales.profitLoss')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 rounded-full active:bg-secondary/20"
          >
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Filters Overlay */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="flex-1">
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder={t('general.from')}
              />
            </View>
            <View className="flex-1">
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder={t('general.to')}
              />
            </View>
          </View>

          {/* Mode & status Row */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center bg-secondary/20 p-0.5 rounded-lg border border-border/30">
              <TouchableOpacity
                onPress={() => handleTabChange('salesman')}
                style={[
                  styles.tabButton,
                  activeTab === 'salesman' && activeTabStyle,
                ]}
              >
                <Users
                  size={12}
                  color={
                    activeTab === 'salesman'
                      ? colors.primary
                      : colors.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'salesman' && { color: colors.primary },
                  ]}
                >
                  {t('element.salesman')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTabChange('route')}
                style={[
                  styles.tabButton,
                  activeTab === 'route' && activeTabStyle,
                ]}
              >
                <MapIcon
                  size={12}
                  color={
                    activeTab === 'route'
                      ? colors.primary
                      : colors.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'route' && { color: colors.primary },
                  ]}
                >
                  {t('sales.route')}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-secondary/10 rounded-lg py-1.5 px-3 border border-border/50">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase mr-2.5">
                {t('sales.released')}
              </Text>
              <Switch
                value={release}
                onValueChange={setRelease}
                thumbColor={release ? colors.primary : '#f4f3f4'}
                trackColor={{ false: '#767577', true: colors.primary + '80' }}
                style={{
                  transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
                  height: 20,
                }}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Dashboard Summary */}
        <View className="p-4">
          <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {t('sales.overallPerformance')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
            className="-mx-4 px-4"
          >
            <StatCard
              label={t('approve.salesApprove.totalSales')}
              value={numberWithComma(summary.totalSales)}
              icon={DollarSign}
              color={colors.primary}
            />
            <StatCard
              label={t('sales.grossProfit')}
              value={numberWithComma(summary.totalProfit)}
              subValue={`${summary.margin.toFixed(1)}% ${t('sales.margin')}`}
              icon={summary.totalProfit >= 0 ? TrendingUp : TrendingDown}
              color={
                summary.totalProfit >= 0 ? colors.green : colors.destructive
              }
            />
          </ScrollView>
        </View>

        {/* List Section Title */}
        <View className="p-4 pt-2 border-t border-border/30 mt-2">
          <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
            {t('sales.breakdownDetails')}
          </Text>

          {loadingOmzet || loadingRoute ? (
            <View className="py-10 items-center">
              <Text className="text-muted-foreground">
                {t('sales.loadingReport')}
              </Text>
            </View>
          ) : (
            displayedData.map((item: any, index: number) => {
              const profit = Number(item.Profit || 0);
              const margin =
                Number(item.HPP) > 0 ? (profit / Number(item.HPP)) * 100 : 0;

              return (
                <Card
                  key={`profit-${activeTab}-${index}`}
                  className="mb-3 overflow-hidden border border-border bg-card"
                >
                  <View className="p-4">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-foreground mb-0.5">
                          {item.Salesman || 'Unknown'}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {item.Count || 0} {t('sales.outletsCovered')}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-bold text-primary">
                          {numberWithComma(item.Amount)}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground">
                          {t('approve.salesApprove.totalSales')}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row gap-4 pt-3 border-t border-border/50">
                      <View className="flex-1">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                          {t('element.profit')}
                        </Text>
                        <Text
                          className="font-bold"
                          style={{
                            color:
                              profit >= 0 ? colors.green : colors.destructive,
                          }}
                        >
                          {numberWithComma(profit)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                          {t('sales.margin')}
                        </Text>
                        <Text className="font-bold text-foreground">
                          {margin.toFixed(1)}%
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                          {t('element.weight')}
                        </Text>
                        <Text className="font-bold text-foreground">
                          {numberWithComma(item.Weight, 2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })
          )}

          {!loadingOmzet && !loadingRoute && displayedData.length === 0 && (
            <View className="py-20 items-center">
              <Text className="text-muted-foreground">
                {t('sales.noRecordsPeriod')}
              </Text>
            </View>
          )}
        </View>

        <View className="h-10" />
      </ScrollView>

      <Loading isLoading={loadingOmzet || loadingRoute || isChangingTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
});
