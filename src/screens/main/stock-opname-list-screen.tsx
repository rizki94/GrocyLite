import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Card } from '../../components/ui/card';
import {
  FileText,
  ChevronRight,
  Plus,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react-native';
import { useThemeColor } from '../../lib/colors';
import { useNavigation } from '@react-navigation/native';
import { useConnection } from '../../hooks/use-connection';
import { DatePicker } from '../../components/ui/date-picker';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StockOpnameItem {
  date: string;
  invoice: string;
  notes: string;
}

export function StockOpnameListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const { apiClient } = useConnection();

  const [stockOpnames, setStockOpnames] = useState<StockOpnameItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Date range filter - default to current month
  const [startDate, setStartDate] = useState<Date>(
    moment().startOf('month').toDate(),
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  const fetchStockOpnames = useCallback(
    async (page: number = 1, isRefresh: boolean = false) => {
      if (isLoadingMore && !isRefresh) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const params: any = {
          page: page,
          per_page: 15,
        };

        if (startDate && endDate) {
          params.startDate = moment(startDate).format('YYYY-MM-DD');
          params.endDate = moment(endDate).format('YYYY-MM-DD');
        }

        const response = await apiClient.get('api/stock_opname/list', {
          params,
        });

        const newData = response.data.data || [];

        if (isRefresh || page === 1) {
          setStockOpnames(newData);
        } else {
          setStockOpnames(prev => [...prev, ...newData]);
        }

        setHasMore(response.data.current_page < response.data.last_page);
        setCurrentPage(response.data.current_page);
        setFetchError(null);
      } catch (error: any) {
        console.error('Failed to fetch stock opnames', error);
        setFetchError(error.message || 'Network Error');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [apiClient, isLoadingMore, startDate, endDate],
  );

  useEffect(() => {
    fetchStockOpnames(1);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      setCurrentPage(1);
      setHasMore(true);
      fetchStockOpnames(1);
    }
  }, [startDate, endDate]);

  const onRefresh = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchStockOpnames(1, true);
  }, [fetchStockOpnames]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchStockOpnames(currentPage + 1);
    }
  }, [currentPage, hasMore, isLoadingMore, isLoading, fetchStockOpnames]);

  const renderItem = ({ item }: { item: StockOpnameItem }) => (
    <Card className="overflow-hidden mb-3 border border-border bg-card">
      <Pressable
        className="p-4 flex-row items-center active:opacity-70"
        onPress={() => {
          navigation.navigate('StockOpnameDetail', { invoice: item.invoice });
        }}
      >
        <View className="w-10 h-10 bg-secondary rounded-full items-center justify-center mr-4">
          <FileText size={20} color={colors.foreground} />
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text className="text-foreground font-bold text-foreground mb-1">
              {item.invoice}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {moment(item.date).format('DD MMM YYYY')}
            </Text>
          </View>
          <Text className="text-sm text-muted-foreground" numberOfLines={2}>
            {item.notes || t('warehouse.stockOpname.noNotes')}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </Pressable>
    </Card>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
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
      {/* Header */}
      <View className="bg-card border-b border-border">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="p-2 -ml-2 rounded-full active:bg-secondary/20"
            >
              <ArrowLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground ml-2">
              {t('warehouse.stockOpname.title')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 rounded-full active:bg-secondary/20"
          >
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Date Filters */}
        <View className="px-4 pb-4">
          <View className="flex-row gap-2">
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
        </View>
      </View>

      {/* List */}
      <View className="flex-1">
        {fetchError && stockOpnames.length === 0 ? (
          <ConnectionError onRetry={onRefresh} message={fetchError} />
        ) : (
          <FlatList
            data={stockOpnames}
            keyExtractor={(item, index) => item.invoice || index.toString()}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: insets.bottom + 100,
            }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              !isLoading ? (
                <View className="items-center justify-center py-20">
                  <FileText
                    size={48}
                    color={colors.mutedForeground}
                    style={{ opacity: 0.3 }}
                  />
                  <Text className="text-muted-foreground mt-4">
                    {t('warehouse.stockOpname.noRecordsFound')}
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>

      <Loading isLoading={isLoading && stockOpnames.length === 0} />

      {/* Floating Add Button */}
      {!fetchError && (
        <Pressable
          className="absolute right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg active:scale-95"
          style={{ elevation: 8, bottom: insets.bottom + 24 }}
          onPress={() => {
            navigation.navigate('StockOpnameDetail', { invoice: 0 });
          }}
        >
          <Plus size={28} color="#ffffff" />
        </Pressable>
      )}
    </View>
  );
}
