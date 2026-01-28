import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Search, Package2, ArrowLeft, RotateCcw } from 'lucide-react-native';
import { useConnection } from '../../hooks/use-connection';
import { numberWithComma } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';

interface ProductStockItem {
  Name: string;
  Stock: string | number;
  priceA: number;
  priceB: number;
  priceC: number;
  ratio1: number;
  unit1: string;
  ratio2: number;
  unit2: string;
  ratio3: number;
  unit3: string;
  ratio4: number;
  unit4: string;
  [key: string]: any;
}

export function ProductsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const { apiClient } = useConnection();

  const [searchText, setSearchText] = useState('');
  const [finalSearch, setFinalSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchProducts = async (
    pageNum: number,
    search: string,
    isRefresh = false,
  ) => {
    if (isLoading && !isRefresh) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get('api/bridge/product_stock_list', {
        params: { search, page: pageNum, limit: 10 },
      });
      const newData = response.data.data;
      if (isRefresh || pageNum === 1) {
        setProducts(newData);
      } else {
        setProducts(prev => [...prev, ...newData]);
      }
      setHasMore(newData.length === 10);
      setFetchError(null);
    } catch (error: any) {
      console.error('Fetch products error:', error);
      setFetchError(error.message || 'Network Error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, finalSearch);
  }, [finalSearch]);

  const handleSearch = () => {
    setPage(1);
    setFinalSearch(searchText);
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, finalSearch);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1, finalSearch, true);
  };

  const processStock = (val: ProductStockItem) => {
    const difference = parseInt(String(val.Stock));
    const r1 = val.ratio1 || 1;
    const r2 = val.ratio2 || 1;
    const r3 = val.ratio3 || 1;
    const r4 = val.ratio4 || 1;

    const q1 = Math.trunc(difference / r1);
    const r1_rem = difference % r1;
    const q2 = Math.trunc(r1_rem / r2);
    const r2_rem = r1_rem % r2;
    const q3 = Math.trunc(r2_rem / r3);
    const r3_rem = r2_rem % r3;
    const q4 = Math.trunc(r3_rem / r4);

    let parts = [];
    if (q1 !== 0 || (!val.unit2 && !val.unit3 && !val.unit4))
      parts.push(`${q1} ${val.unit1 || ''}`);
    if (val.unit2 && q2 !== 0) parts.push(`${q2} ${val.unit2}`);
    if (val.unit3 && q3 !== 0) parts.push(`${q3} ${val.unit3}`);
    if (val.unit4 && q4 !== 0) parts.push(`${q4} ${val.unit4}`);

    return parts.length > 0 ? parts.join(' | ') : `0 ${val.unit1 || ''}`;
  };

  const processedProducts = useMemo(() => {
    return products.map(item => ({
      ...item,
      formattedStock: processStock(item),
    }));
  }, [products]);

  const renderItem = ({
    item,
  }: {
    item: ProductStockItem & { formattedStock: string };
  }) => (
    <Card className="overflow-hidden mb-3 border border-border bg-card">
      <CardContent className="p-4 flex-row items-center">
        <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mr-4">
          <Package2 size={24} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-bold text-foreground mb-1">
            {item.Name}
          </Text>
          <Text className="text-xs text-muted-foreground mb-2">
            {item.formattedStock}
          </Text>

          <View className="flex-row justify-between bg-secondary/30 p-2 rounded-lg">
            <View>
              <Text className="text-[10px] text-muted-foreground">
                {t('inventory.priceA')}
              </Text>
              <Text className="text-sm text-foreground font-semibold">
                {numberWithComma(item.priceA)}
              </Text>
            </View>
            <View className="border-l border-border mx-2" />
            <View>
              <Text className="text-[10px] text-muted-foreground">
                {t('inventory.priceB')}
              </Text>
              <Text className="text-sm text-foreground font-semibold">
                {numberWithComma(item.priceB)}
              </Text>
            </View>
            <View className="border-l border-border mx-2" />
            <View>
              <Text className="text-[10px] text-muted-foreground">
                {t('inventory.priceC')}
              </Text>
              <Text className="text-sm text-foreground font-semibold">
                {numberWithComma(item.priceC)}
              </Text>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: insets.bottom,
      }}
    >
      <View className="bg-card border-b border-border mb-4">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="p-2 -ml-2 rounded-full active:bg-secondary/20"
            >
              <ArrowLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground ml-2">
              {t('inventory.title')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 rounded-full active:bg-secondary/20"
          >
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View className="px-4 mb-4">
          <View className="relative">
            <View className="absolute left-3 top-2 z-10">
              <Search size={20} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder={t('inventory.searchPlaceholder')}
              className="pl-10 bg-secondary/50 border-0 h-10"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
        </View>
      </View>

      <View className="flex-1">
        {fetchError && products.length === 0 ? (
          <ConnectionError onRetry={onRefresh} message={fetchError} />
        ) : (
          <FlatList
            data={processedProducts}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoading && page > 1 ? (
                <View className="py-4">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              !isLoading ? (
                <View className="items-center justify-center py-20">
                  <Package2
                    size={48}
                    color={colors.mutedForeground}
                    style={{ opacity: 0.3 }}
                  />
                  <Text className="text-muted-foreground">
                    {t('inventory.noProducts')}
                  </Text>
                </View>
              ) : null
            }
          />
        )}
        {isLoading && page === 1 && products.length === 0 && (
          <Loading isLoading={isLoading} />
        )}
      </View>
    </View>
  );
}
