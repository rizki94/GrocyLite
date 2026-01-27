import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Switch,
  TouchableOpacity,
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
  Package,
  Weight as WeightIcon,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { DatePicker } from '../../components/ui/date-picker';
import { Card } from '../../components/ui/card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loading } from '../../components/ui/loading';
import { useTranslation } from 'react-i18next';

const StatCard = ({ label, value, subValue, icon: Icon, color }: any) => (
  <View
    className="p-3 rounded-xl border bg-card min-w-[140px]"
    style={{ borderColor: color + '40', backgroundColor: color + '08' }}
  >
    <View className="flex-row items-center justify-between mb-2">
      <View
        className="p-1.5 rounded-lg"
        style={{ backgroundColor: color + '15' }}
      >
        <Icon size={14} color={color} />
      </View>
    </View>
    <Text className="text-[10px] text-muted-foreground font-extrabold uppercase mb-1">
      {label}
    </Text>
    <Text className="text-base font-black text-foreground" numberOfLines={1}>
      {value}
    </Text>
    {subValue && (
      <Text className="text-[9px] font-bold mt-1" style={{ color: color }}>
        {subValue}
      </Text>
    )}
  </View>
);

export function ProfitScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [release, setRelease] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'salesman' | 'route'>('salesman');
  const [isChangingTab, setIsChangingTab] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    const totalWeight = data.reduce(
      (acc, curr) => acc + (Number(curr.Weight) || 0),
      0,
    );
    const totalVolume = data.reduce(
      (acc, curr) => acc + (Number(curr.Volume) || 0),
      0,
    );
    const margin = totalHPP > 0 ? (totalProfit / totalHPP) * 100 : 0;
    return { totalSales, totalProfit, margin, totalWeight, totalVolume };
  }, [omzets]);

  const selectedSummary = useMemo(() => {
    const selectedData = displayedData.filter((_, idx) =>
      selectedIds.includes(`${activeTab}-${idx}`),
    );
    const amount = selectedData.reduce(
      (acc, curr) => acc + (Number(curr.Amount) || 0),
      0,
    );
    const profit = selectedData.reduce(
      (acc, curr) => acc + (Number(curr.Profit) || 0),
      0,
    );
    const weight = selectedData.reduce(
      (acc, curr) => acc + (Number(curr.Weight) || 0),
      0,
    );
    const volume = selectedData.reduce(
      (acc, curr) => acc + (Number(curr.Volume) || 0),
      0,
    );
    return { amount, profit, weight, volume, count: selectedData.length };
  }, [selectedIds, displayedData, activeTab]);

  const handleTabChange = (tab: 'salesman' | 'route') => {
    if (tab === activeTab) return;
    setIsChangingTab(true);
    setActiveTab(tab);
    setSelectedIds([]);
    setTimeout(() => setIsChangingTab(false), 500);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === displayedData.length) setSelectedIds([]);
    else setSelectedIds(displayedData.map((_, idx) => `${activeTab}-${idx}`));
  };

  const insets = useSafeAreaInsets();

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
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="p-2 -ml-2 rounded-full"
            >
              <ArrowLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground ml-2">
              {t('sales.profitLoss')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1">
              <DatePicker value={startDate} onChange={setStartDate} />
            </View>
            <View className="flex-1">
              <DatePicker value={endDate} onChange={setEndDate} />
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row bg-secondary/20 p-0.5 rounded-lg">
              <TouchableOpacity
                onPress={() => handleTabChange('salesman')}
                style={[
                  styles.tabButton,
                  activeTab === 'salesman' && { backgroundColor: colors.card },
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
                  activeTab === 'route' && { backgroundColor: colors.card },
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
            <View className="flex-row items-center bg-secondary/10 px-3 py-1.5 rounded-lg">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase mr-2.5">
                {t('sales.released')}
              </Text>
              <Switch
                value={release}
                onValueChange={setRelease}
                thumbColor={release ? colors.primary : '#f4f3f4'}
                trackColor={{ false: '#767577', true: colors.primary + '80' }}
                style={{ transform: [{ scale: 0.8 }] }}
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
        <View className="p-4">
          <Text className="text-sm font-bold text-muted-foreground uppercase mb-3">
            {t('sales.overallPerformance')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
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
              subValue={`${summary.margin.toFixed(1)}%`}
              icon={TrendingUp}
              color={colors.green}
            />
            <StatCard
              label={t('element.weight')}
              value={numberWithComma(summary.totalWeight, 2)}
              icon={WeightIcon}
              color={colors.indigo}
            />
            <StatCard
              label={t('element.volume')}
              value={numberWithComma(summary.totalVolume, 2)}
              icon={Package}
              color={colors.amber}
            />
          </ScrollView>
        </View>

        <View className="p-4 border-t border-border/30">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-bold text-muted-foreground uppercase">
              {t('sales.breakdownDetails')}
            </Text>
            <TouchableOpacity
              onPress={selectAll}
              className="flex-row items-center bg-secondary/10 px-3 py-1.5 rounded-lg border border-border/50"
            >
              <Text className="text-[10px] font-bold text-primary uppercase mr-2">
                {selectedIds.length === displayedData.length
                  ? t('general.deselectAll')
                  : t('general.selectAll')}
              </Text>
              {selectedIds.length === displayedData.length ? (
                <CheckSquare size={14} color={colors.primary} />
              ) : (
                <Square size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {displayedData.map((item: any, index: number) => {
            const profit = Number(item.Profit || 0);
            const margin =
              Number(item.HPP) > 0 ? (profit / Number(item.HPP)) * 100 : 0;
            const itemId = `${activeTab}-${index}`;
            const isSelected = selectedIds.includes(itemId);
            return (
              <Card
                key={itemId}
                className={cn(
                  'mb-4 overflow-hidden border bg-card',
                  isSelected ? 'border-primary/50' : 'border-border',
                )}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleSelection(itemId)}
                  className="p-4"
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 flex-row items-center">
                      <View className="mr-3">
                        {isSelected ? (
                          <View className="bg-primary p-0.5 rounded">
                            <CheckSquare size={18} color="#fff" />
                          </View>
                        ) : (
                          <Square size={18} color={colors.mutedForeground} />
                        )}
                      </View>
                      <View>
                        <Text className="text-base font-extrabold text-foreground uppercase">
                          {item.Salesman || 'Unknown'}
                        </Text>
                        <Text className="text-xs text-muted-foreground mt-0.5">
                          {item.Count || 0} Outlets
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-black text-primary">
                        {numberWithComma(item.Amount)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row bg-secondary/10 rounded-xl p-3">
                    <View className="flex-1">
                      <Text className="text-[9px] text-muted-foreground uppercase font-extrabold mb-1">
                        Profit
                      </Text>
                      <Text
                        className="text-xs font-bold"
                        style={{
                          color:
                            profit >= 0 ? colors.green : colors.destructive,
                        }}
                      >
                        {numberWithComma(profit)}
                      </Text>
                      <Text className="text-[10px] text-muted-foreground mt-0.5">
                        {margin.toFixed(1)}%
                      </Text>
                    </View>
                    <View className="w-[1px] bg-border/50 mx-2" />
                    <View className="flex-1 items-center">
                      <Text className="text-[9px] text-muted-foreground uppercase font-extrabold mb-1">
                        Weight
                      </Text>
                      <Text className="text-xs font-bold text-foreground">
                        {numberWithComma(item.Weight, 2)}
                      </Text>
                      <Text className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                        KG
                      </Text>
                    </View>
                    <View className="w-[1px] bg-border/50 mx-2" />
                    <View className="flex-1 items-end">
                      <Text className="text-[9px] text-muted-foreground uppercase font-extrabold mb-1">
                        Volume
                      </Text>
                      <Text className="text-xs font-bold text-foreground">
                        {numberWithComma(item.Volume, 2)}
                      </Text>
                      <Text className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                        M³
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Card>
            );
          })}
        </View>
        <View className="h-20" />
      </ScrollView>

      {selectedIds.length > 0 && (
        <View
          className="bg-card border-t border-border pt-4 px-4 shadow-xl"
          style={{
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 10,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-black text-primary uppercase">
              {selectedIds.length} {t('general.selected')}
            </Text>
            <TouchableOpacity onPress={() => setSelectedIds([])}>
              <Text className="text-[10px] font-bold text-muted-foreground uppercase">
                Clear
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1 bg-primary/5 p-2 rounded-xl items-center border border-primary/30">
              <Text className="text-[8px] font-extrabold text-primary uppercase mb-1">
                {t('approve.salesApprove.totalSales')}
              </Text>
              <Text className="text-xs font-bold text-primary">
                {numberWithComma(selectedSummary.amount)}
              </Text>
            </View>
            <View className="flex-1 bg-green-500/5 p-2 rounded-xl items-center border border-green-500/30">
              <Text className="text-[8px] font-extrabold text-green-600 uppercase mb-1">
                {t('sales.grossProfit')}
              </Text>
              <Text className="text-xs font-bold text-green-600">
                {numberWithComma(selectedSummary.profit)}
              </Text>
            </View>
            <View className="flex-1 bg-indigo-500/5 p-2 rounded-xl items-center border border-indigo-500/30">
              <Text className="text-[8px] font-extrabold text-indigo-600 uppercase mb-1">
                {t('element.weight')}
              </Text>
              <Text className="text-xs font-bold text-indigo-600">
                {numberWithComma(selectedSummary.weight, 1)}
              </Text>
            </View>
            <View className="flex-1 bg-amber-500/5 p-2 rounded-xl items-center border border-amber-500/30">
              <Text className="text-[8px] font-extrabold text-amber-600 uppercase mb-1">
                {t('element.volume')}
              </Text>
              <Text className="text-xs font-bold text-amber-600">
                {numberWithComma(selectedSummary.volume, 1)}
              </Text>
            </View>
          </View>
        </View>
      )}
      <Loading isLoading={loadingOmzet || loadingRoute || isChangingTab} />
    </View>
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
