import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ToastAndroid,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useConnection } from '../../hooks/use-connection';
import { useTranslation } from 'react-i18next';
import { numberWithComma, dateFormatted } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import { Search, ArrowLeft, RotateCcw } from 'lucide-react-native';
import { useThemeColor } from '../../lib/colors';
import { Input } from '../../components/ui/input';
import { DatePicker } from '../../components/ui/date-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Loading } from '../../components/ui/loading';

interface CancelTransactionItem {
  NoTr: string;
  CompanyName: string;
  NetAmount: number;
  Source: string;
  Descr: string;
  opened?: boolean;
}

export function CancelTransactionScreen() {
  const { t } = useTranslation();
  const { apiClient } = useConnection();
  const colors = useThemeColor();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [transactions, setTransactions] = useState<CancelTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTransactions = useCallback(
    async (page: number = 1, isRefresh: boolean = false, search: string = debouncedSearch) => {
      if (isLoadingMore && !isRefresh) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const response = await apiClient.get('api/bridge/cancel_transaction', {
          params: {
            date: dateFormatted(date),
            search: search,
            page: page,
            per_page: 15,
          },
        });

        const resData = response.data;
        const newData = resData.data || [];

        if (isRefresh || page === 1) {
          setTransactions(newData);
        } else {
          setTransactions(prev => [...prev, ...newData]);
        }

        setHasMore(resData.current_page < resData.last_page);
        setCurrentPage(resData.current_page);
      } catch (error) {
        console.error('Failed to fetch transactions', error);
        ToastAndroid.show('Failed to load transactions', ToastAndroid.SHORT);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [apiClient, date, debouncedSearch, isLoadingMore],
  );

  // Trigger fetch when date or debounced search changes
  useEffect(() => {
    fetchTransactions(1, false);
  }, [date, debouncedSearch]);

  const onRefresh = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchTransactions(1, true);
  }, [fetchTransactions]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchTransactions(currentPage + 1);
    }
  }, [currentPage, hasMore, isLoadingMore, isLoading, fetchTransactions]);

  const handleOpen = async (invoice: string, source: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('api/bridge/open_invoice', {
        invoice,
        source,
      });
      if (response.data.status === 200) {
        ToastAndroid.show(
          t('cancelTransaction.openSuccess', 'Transaction Opened Successfully'),
          ToastAndroid.SHORT,
        );
        // Mark as opened locally
        setTransactions(prev =>
          prev.map(item =>
            item.NoTr === invoice ? { ...item, opened: true } : item,
          ),
        );
      } else {
        ToastAndroid.show(
          t('cancelTransaction.openFailed', 'Failed to open transaction'),
          ToastAndroid.SHORT,
        );
      }
    } catch (e: any) {
      ToastAndroid.show(e.message || 'Error', ToastAndroid.SHORT);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: CancelTransactionItem }) => (
    <View className="mb-3 mx-4 p-4 rounded-2xl border border-border/40 bg-card shadow-sm flex-row justify-between items-center">
      <View className="flex-1 mr-3">
        <View className="flex-row items-center mb-1.5 flex-wrap">
          <View className={cn(
            "px-2 py-0.5 rounded-md mr-2",
            item.Source === 'PKP' ? 'bg-blue-500/10 dark:bg-blue-500/20' : 
            item.Source === 'NON' ? 'bg-amber-500/10 dark:bg-amber-500/20' : 
            'bg-purple-500/10 dark:bg-purple-500/20'
          )}>
            <Text className={cn(
              "text-[10px] font-black uppercase tracking-wider",
              item.Source === 'PKP' ? 'text-blue-600 dark:text-blue-400' : 
              item.Source === 'NON' ? 'text-amber-600 dark:text-amber-400' : 
              'text-purple-600 dark:text-purple-400'
            )}>{item.Source}</Text>
          </View>
          <Text className="font-mono text-xs text-muted-foreground font-bold">
            {item.NoTr}
          </Text>
        </View>
        
        <Text className="font-extrabold text-sm text-foreground mb-1.5" numberOfLines={1}>
          {item.CompanyName}
        </Text>
        
        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-muted-foreground font-semibold">
            {item.Descr}
          </Text>
          <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400">
            Rp {numberWithComma(item.NetAmount)}
          </Text>
        </View>
      </View>
      
      <View className="justify-center">
        {item.opened ? (
          <View className="bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-2 rounded-xl border border-emerald-500/20">
            <Text className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
              {t('cancelTransaction.opened', 'Opened')}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            className="bg-primary px-4 py-2.5 rounded-xl active:opacity-85"
            onPress={() => handleOpen(item.NoTr, item.Source)}
          >
            <Text className="text-primary-foreground font-black text-xs uppercase tracking-wider">
              {t('cancelTransaction.open', 'Open')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  };

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
              {t('cancelTransaction.title', 'Cancel Transaction')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <DatePicker value={date} onChange={setDate} />
            </View>
          </View>

          <View className="relative">
            <View className="absolute left-3 top-2.5 z-10">
              <Search size={18} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder={t('cancelTransaction.searchPlaceholder', 'Search invoice or customer...')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="h-10 pl-10 bg-background border border-border rounded-xl font-bold text-xs"
            />
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1 pt-4"
        data={transactions}
        renderItem={renderItem}
        keyExtractor={item => item.NoTr}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                {t('cancelTransaction.noTransactions', 'No Transactions Found')}
              </Text>
            </View>
          ) : null
        }
      />
      <Loading isLoading={isLoading} />
    </View>
  );
}
