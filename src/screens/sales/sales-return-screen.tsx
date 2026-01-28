import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '../../lib/colors';
import { DatePicker } from '../../components/ui/date-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';

export function SalesReturnScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Memoize params to avoid infinite loop in useFetchWithParams
  const params = useMemo(
    () => ({
      params: {
        startDate: dateFormatted(startDate),
        endDate: dateFormatted(endDate),
      },
    }),
    [startDate, endDate],
  );

  const {
    data: salesReturns,
    isLoading,
    fetchError,
  } = useFetchWithParams(
    'api/bridge/sales_return',
    params,
    [startDate, endDate],
    refreshing,
  );

  const [expandedCompanies, setExpandedCompanies] = useState<
    Record<string, boolean>
  >({});

  const toggleExpand = (companyName: string) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyName]: !prev[companyName],
    }));
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const groupedData = useMemo(() => {
    if (!Array.isArray(salesReturns)) return [];

    const groups: Record<
      string,
      { CompanyName: string; Total: number; Items: any[] }
    > = {};

    salesReturns.forEach((item: any) => {
      const company = item.CompanyName || 'Unknown';
      if (!groups[company]) {
        groups[company] = {
          CompanyName: company,
          Total: 0,
          Items: [],
        };
      }
      groups[company].Total += Number(item.Amount || 0);
      groups[company].Items.push(item);
    });

    return Object.values(groups);
  }, [salesReturns]);

  const grandTotal = groupedData.reduce((acc, curr) => acc + curr.Total, 0);

  const renderGroup = ({ item: group }: { item: any }) => (
    <View
      className={cn(
        'mb-4 mx-4 overflow-hidden rounded-2xl border bg-card',
        expandedCompanies[group.CompanyName]
          ? 'border-primary/40'
          : 'border-border/60',
      )}
    >
      <Pressable
        className={cn(
          'p-4 flex-row items-center justify-between transition-all',
          expandedCompanies[group.CompanyName] ? 'bg-secondary/10' : 'bg-card',
        )}
        onPress={() => toggleExpand(group.CompanyName)}
      >
        <View className="flex-1 mr-4">
          <Text className="font-extrabold text-base text-foreground mb-1">
            {group.CompanyName}
          </Text>
          <Text className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
            {group.Items.length} {t('element.items')}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-black text-lg text-primary mb-1">
            {numberWithComma(group.Total)}
          </Text>
          {expandedCompanies[group.CompanyName] ? (
            <ChevronUp size={20} color={colors.primary} />
          ) : (
            <ChevronDown size={20} color={colors.mutedForeground} />
          )}
        </View>
      </Pressable>

      {expandedCompanies[group.CompanyName] && (
        <View className="border-t border-border/40">
          <View className="flex-row bg-secondary/30 px-4 py-2 border-b border-border/30">
            <Text className="flex-[2] text-[10px] font-extrabold text-muted-foreground uppercase">
              {t('element.product')}
            </Text>
            <Text className="flex-1 text-[10px] font-extrabold text-muted-foreground uppercase text-right mr-2">
              {t('element.qty')}
            </Text>
            <Text className="flex-1 text-[10px] font-extrabold text-muted-foreground uppercase">
              {t('element.unit')}
            </Text>
            <Text className="flex-1 text-[10px] font-extrabold text-muted-foreground uppercase text-right">
              {t('element.total')}
            </Text>
          </View>
          {group.Items.map((item: any, idx: number) => (
            <View
              key={idx}
              className="flex-row px-4 py-3 border-b border-border/20 items-center"
            >
              <View className="flex-[2] mr-1">
                <Text className="text-xs font-bold text-foreground mb-0.5">
                  {item.Product_Name}
                </Text>
                <Text
                  className="text-[10px] text-muted-foreground"
                  numberOfLines={1}
                >
                  {item.Descr}
                </Text>
              </View>
              <Text className="flex-1 text-xs font-medium text-foreground text-right mr-2">
                {numberWithComma(item.Qty)}
              </Text>
              <Text className="flex-1 text-xs text-muted-foreground font-medium uppercase">
                {item.Unit}
              </Text>
              <Text className="flex-1 text-xs font-bold text-foreground text-right">
                {numberWithComma(item.Amount)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

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
              {t('dashboard.salesReturn')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="flex-row gap-3 mt-4 mb-4">
            <View className="flex-1">
              <DatePicker
                label={t('general.from')}
                value={startDate}
                onChange={setStartDate}
              />
            </View>
            <View className="flex-1">
              <DatePicker
                label={t('general.to')}
                value={endDate}
                onChange={setEndDate}
              />
            </View>
          </View>

          <View className="p-6 rounded-2xl bg-primary border border-primary/20 shadow-lg items-center">
            <Text className="text-primary-foreground text-xs font-bold uppercase tracking-[2px] opacity-80 mb-2">
              {t('element.grandTotal')}
            </Text>
            <Text className="font-black text-4xl text-white">
              {numberWithComma(grandTotal)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1 pt-4"
        data={fetchError && groupedData.length === 0 ? [] : groupedData}
        renderItem={renderGroup}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          fetchError && groupedData.length === 0 ? (
            <ConnectionError onRetry={onRefresh} message={fetchError} />
          ) : !isLoading ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                {t('general.noData')}
              </Text>
            </View>
          ) : null
        }
      />
      <Loading isLoading={isLoading} />
    </View>
  );
}
