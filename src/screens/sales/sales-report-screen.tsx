import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '../../components/ui/date-picker';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import { Search, Users, ArrowLeft, RotateCcw } from 'lucide-react-native';
import { Input } from '../../components/ui/input';
import { useDebounce } from '../../hooks/use-debounce';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export function SalesReportScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const filters = useMemo(
    () => ({
      startDate: dateFormatted(startDate),
      endDate: dateFormatted(endDate),
      search: debouncedSearch,
    }),
    [startDate, endDate, debouncedSearch],
  );

  const {
    data: omzetData,
    isLoading,
    fetchError,
  } = useFetchWithParams(
    'api/bridge/omzet_sales',
    { params: filters },
    filters,
    refreshing,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Transform the object response from api/bridge/omzet_sales into an array
  const omzet = useMemo(() => {
    if (!omzetData) return [];
    // The backend returns an object keyed by salesman name for omzet_sales
    return Array.isArray(omzetData) ? omzetData : Object.values(omzetData);
  }, [omzetData]);

  const grandTotal = omzet.reduce(
    (acc, curr) => acc + (Number(curr.Amount) || 0),
    0,
  );

  const renderItem = ({ item }: { item: any }) => (
    <View className="mb-4 mx-4 p-4 rounded-2xl border border-border/60 bg-card shadow-sm">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 flex-row items-center mr-4">
          <View className="p-2 rounded-xl bg-primary/10 mr-3">
            <Users size={16} color={colors.primary} />
          </View>
          <Text
            className="font-extrabold text-sm text-foreground uppercase tracking-tight"
            numberOfLines={1}
          >
            {item.Salesman || t('general.noData')}
          </Text>
        </View>
        <Text className="font-black text-primary text-base">
          {numberWithComma(item.Amount || 0)}
        </Text>
      </View>
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
              {t('sales.omzetReport')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="flex-row gap-3 mb-4">
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

          <View className="p-6 rounded-2xl bg-primary/5 border border-primary/30 items-center mb-6">
            <Text className="text-muted-foreground text-[10px] uppercase font-bold tracking-[2px] mb-2">
              {t('sales.grandTotal')}
            </Text>
            <Text className="font-black text-4xl text-primary">
              {numberWithComma(grandTotal)}
            </Text>
          </View>

          {/* Search Input */}
          <View className="relative">
            <View className="absolute left-3 top-3 z-10">
              <Search size={18} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder={t('general.search')}
              className="pl-10 h-12 bg-secondary/10 border border-border/50 rounded-xl font-bold text-xs"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1 pt-4"
        data={fetchError && omzet.length === 0 ? [] : omzet}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          fetchError && omzet.length === 0 ? (
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
