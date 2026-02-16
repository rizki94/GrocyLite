import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Search, ArrowLeft, RotateCcw, Download } from 'lucide-react-native';
import { useConnection } from '../../hooks/use-connection';
import { numberWithComma } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import { cn } from '../../lib/utils';

interface ProductStockItem {
  id: string | number;
  Name: string;
  Category?: string;
  Source: string;
  Stock: string | number;
  unit1: string;
  unit2: string;
  unit3: string;
  unit4: string;
  ratio1: number;
  ratio2: number;
  ratio3: number;
  ratio4: number;
  PriceA1: number; PriceA2: number; PriceA3: number;
  PriceB1: number; PriceB2: number; PriceB3: number;
  PriceC1: number; PriceC2: number; PriceC3: number;
  PriceD1: number; PriceD2: number; PriceD3: number;
  PriceE1: number; PriceE2: number; PriceE3: number;
  [key: string]: any;
}

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function ProductsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const { apiClient } = useConnection();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const [searchText, setSearchText] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [allProductsCache, setAllProductsCache] = useState<any[]>([]);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const [selectedPrices, setSelectedPrices] = useState<string[]>(['A']);
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  const priceTiers = ['A', 'B', 'C', 'D', 'E'];

  const tierColors: Record<string, { bg: string, text: string, border: string }> = {
    A: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20' },
    B: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
    C: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-500/20' },
    D: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-500/20' },
    E: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-500/20' },
  };

  const PRODUCTS_CACHE_KEY = 'products_full_cache';
  const LAST_SYNC_KEY = 'products_last_sync';

  // Load cache on mount
  useEffect(() => {
    loadCache();
  }, []);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

      if (cached) {
        setAllProductsCache(JSON.parse(cached));
      }
      if (lastSync) {
        setLastSyncDate(lastSync);
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    } finally {
      setIsCacheLoaded(true);
    }
  };

  // Check if cache needs update (once per day)
  useEffect(() => {
    const checkAndSync = async () => {
      if (!isCacheLoaded || isConnected === false) return;

      const today = new Date().toDateString();
      if (lastSyncDate !== today && !isSyncing) {
        // Auto-sync if cache is old
        await syncAllProducts();
      }
    };

    checkAndSync();
  }, [isConnected, lastSyncDate, isCacheLoaded]);

  const syncAllProducts = async (forceSync = false) => {
    if (isConnected === false && !forceSync) {
      Alert.alert(t('element.error'), t('element.mustConnectInternet'));
      return;
    }

    try {
      setIsSyncing(true);
      setSyncProgress({ current: 0, total: 0 });

      let currentPage = 1;
      let allProducts: any[] = [];
      let hasMoreData = true;

      while (hasMoreData) {
        const response = await apiClient.get('/api/bridge/product_stock_list', {
          params: { search: '', page: currentPage, limit: 100 },
        });
        const pageData = response.data.data;

        if (pageData && pageData.length > 0) {
          allProducts = [...allProducts, ...pageData];
          setSyncProgress({ current: allProducts.length, total: allProducts.length + 100 });
          currentPage++;
          hasMoreData = pageData.length === 100;
        } else {
          hasMoreData = false;
        }
      }

      // Save to cache
      await AsyncStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(allProducts));
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toDateString());

      setAllProductsCache(allProducts);
      setLastSyncDate(new Date().toDateString());
      setSyncProgress({ current: allProducts.length, total: allProducts.length });

      if (forceSync) {
        Alert.alert(
          t('element.success'),
          t('inventory.syncSuccess', { count: allProducts.length })
        );
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert(t('element.error'), error.message || t('inventory.syncFailed'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Search from cache (instant!)
  const searchProducts = (query: string) => {
    if (!query.trim()) {
      return allProductsCache.slice(0, 20); // Show first 20 if no search
    }

    const lowerQuery = query.toLowerCase();
    return allProductsCache.filter(product =>
      product.Name?.toLowerCase().includes(lowerQuery) ||
      product.Category?.toLowerCase().includes(lowerQuery) ||
      product.id?.toString().includes(lowerQuery)
    );
  };

  // Update products when search changes
  useEffect(() => {
    if (allProductsCache.length > 0) {
      const results = searchProducts(searchText); // Use searchText directly for instant search
      setProducts(results);
      setHasMore(false); // All results shown at once from cache
    }
  }, [searchText, allProductsCache]); // Depend on searchText for instant updates

  const fetchProducts = async (
    pageNum: number,
    search: string,
    isRefresh = false,
  ) => {
    // This function is now only for fallback if cache is empty
    if (allProductsCache.length > 0) {
      // Use cache
      const results = searchProducts(search);
      setProducts(results);
      return;
    }

    // Fallback: fetch from API if no cache
    if (isLoading && !isRefresh) return;
    setIsLoading(true);

    const cacheKey = `products_${search}_${pageNum}`;

    try {
      let newData = [];

      if (isConnected === false) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          newData = JSON.parse(cached);
        } else {
          newData = [];
        }
      } else {
        const response = await apiClient.get('api/bridge/product_stock_list', {
          params: { search, page: pageNum, limit: 20 },
        });
        newData = response.data.data;
        AsyncStorage.setItem(cacheKey, JSON.stringify(newData));
      }

      if (isRefresh || pageNum === 1) {
        setProducts(newData);
      } else {
        setProducts(prev => [...prev, ...newData]);
      }
      setHasMore(newData.length === 20);
      setFetchError(null);
    } catch (error: any) {
      console.error('Fetch products error:', error);
      // Try fallback to cache if network error
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const newData = JSON.parse(cached);
          if (isRefresh || pageNum === 1) {
            setProducts(newData);
          } else {
            setProducts(prev => [...prev, ...newData]);
          }
          setHasMore(newData.length === 20);
          setFetchError(null);
        } else {
          setFetchError(error.message || 'Network Error');
        }
      } catch (e) {
        setFetchError(error.message || 'Network Error');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setIsSearching(false);
    }
  };

  // No longer needed - search is instant now
  // useEffect(() => {
  //   fetchProducts(1, finalSearch);
  // }, [finalSearch]);

  const handleSearch = () => {
    // Keep this for Enter key, but it's now just for consistency
    // Search already happens on every keystroke
    setPage(1);
    setIsSearching(false);
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, searchText);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1, searchText, true);
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
      parts.push(`${q1} ${val.unit1 || ''} `);
    if (val.unit2 && q2 !== 0) parts.push(`${q2} ${val.unit2} `);
    if (val.unit3 && q3 !== 0) parts.push(`${q3} ${val.unit3} `);
    if (val.unit4 && q4 !== 0) parts.push(`${q4} ${val.unit4} `);

    return parts.length > 0 ? parts.join(' | ') : `0 ${val.unit1 || ''} `;
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
    <Card className="overflow-hidden mb-3 border border-border bg-card shadow-sm">
      <CardContent className="p-4">
        {/* Category & Source Badge */}
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row gap-1.5 flex-wrap">
            {item.Category && (
              <View className="bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                <Text className="text-[10px] font-bold text-primary uppercase">
                  {item.Category}
                </Text>
              </View>
            )}
            <View className={cn(
              "px-2 py-0.5 rounded-full border",
              item.Source === "PKP"
                ? "bg-blue-100 border-blue-200 dark:bg-blue-500/20 dark:border-blue-500/30"
                : "bg-emerald-100 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-500/30"
            )}>
              <Text className={cn(
                "text-[10px] font-black uppercase",
                item.Source === "PKP" ? "text-blue-700 dark:text-blue-300" : "text-emerald-700 dark:text-emerald-300"
              )}>
                {item.Source}
              </Text>
            </View>
          </View>
        </View>

        {/* Product Name */}
        <Text className="text-foreground font-bold text-base mb-2 leading-tight">
          {item.Name}
        </Text>

        {/* Stock Info */}
        <View className="flex-row items-center mb-4">
          <View className="bg-secondary/40 px-3 py-1.5 rounded-lg flex-row items-center border border-border/50">
            <View className="w-2 h-2 rounded-full bg-primary/60 mr-2" />
            <Text className="text-[11px] text-foreground font-bold tracking-tight">
              {item.formattedStock}
            </Text>
          </View>
        </View>

        {/* Prices Grid - Sophisticated Layout */}
        <View className="gap-2.5">
          {selectedPrices.map((tier) => {
            const colors = tierColors[tier] || tierColors['A'];
            const p1 = item[`Price${tier}1`];
            const p2 = item[`Price${tier}2`];
            const p3 = item[`Price${tier}3`];

            if (p1 === undefined) return null;

            return (
              <View
                key={tier}
                className={cn("p-2 rounded-xl border", colors.bg, colors.border)}
              >
                <View className="flex-row justify-between items-center mb-1.5 px-1">
                  <Text className={cn("text-[10px] font-black uppercase tracking-widest", colors.text)}>
                    Price {tier}
                  </Text>
                  <View className={cn("px-1.5 py-0.5 rounded bg-white/40 dark:bg-black/20", colors.border)}>
                    <Text className={cn("text-[8px] font-bold uppercase", colors.text)}>Matrix 1-2-3</Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  {/* Price 1 */}
                  <View className="flex-1 bg-white/70 dark:bg-black/20 p-2 rounded-lg items-center">
                    <Text className="text-[8px] text-muted-foreground font-bold uppercase mb-0.5">{tier}1</Text>
                    <Text className="text-sm font-bold text-foreground">
                      {numberWithComma(p1)}
                    </Text>
                  </View>

                  {/* Price 2 */}
                  <View className="flex-1 bg-white/70 dark:bg-black/20 p-2 rounded-lg items-center">
                    <Text className="text-[8px] text-muted-foreground font-bold uppercase mb-0.5">{tier}2</Text>
                    <Text className="text-sm font-bold text-foreground">
                      {numberWithComma(p2)}
                    </Text>
                  </View>

                  {/* Price 3 */}
                  <View className="flex-1 bg-white/70 dark:bg-black/20 p-2 rounded-lg items-center">
                    <Text className="text-[8px] text-muted-foreground font-bold uppercase mb-0.5">{tier}3</Text>
                    <Text className="text-sm font-bold text-foreground">
                      {numberWithComma(p3)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
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
      {/* Header */}
      <View className="bg-card border-b border-border shadow-sm">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center flex-1">
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
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => syncAllProducts(true)}
              disabled={isSyncing || isConnected === false}
              className="p-2 rounded-full active:bg-secondary/20"
            >
              <Download
                size={20}
                color={isSyncing || isConnected === false ? colors.mutedForeground : colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-4 pb-4">
          <View className="relative">
            <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Search size={18} color={colors.mutedForeground} />
              )}
            </View>
            <Input
              placeholder={t('inventory.searchPlaceholder')}
              className="pl-10 pr-4 bg-secondary/30 border border-border/50 h-11 rounded-xl"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              editable={!isSearching}
            />
          </View>
        </View>

        {/* Price Multi-Select Toggles */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pb-4"
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 32, gap: 8 }}
        >
          {['ALL', ...priceTiers].map((tier) => {
            const isAll = tier === 'ALL';
            const isSelected = isAll
              ? selectedPrices.length === priceTiers.length
              : selectedPrices.includes(tier);
            const colors = tierColors[tier] || { text: 'text-primary' };

            return (
              <TouchableOpacity
                key={tier}
                onPress={() => {
                  if (isAll) {
                    setSelectedPrices(isSelected ? ['A'] : [...priceTiers]);
                  } else {
                    if (isSelected) {
                      if (selectedPrices.length > 1) {
                        setSelectedPrices(selectedPrices.filter(p => p !== tier));
                      }
                    } else {
                      setSelectedPrices([...selectedPrices, tier].sort());
                    }
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-full border flex-row items-center",
                  isSelected
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                )}
              >
                {!isAll && (
                  <View className={cn(
                    "w-2.5 h-2.5 rounded-full mr-1.5",
                    isSelected ? "bg-white" : colors.bg || "bg-primary"
                  )} />
                )}
                <Text className={cn(
                  "text-xs font-black",
                  isSelected ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {isAll ? 'ALL PRICES' : `PRICE ${tier}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sync Progress Banner */}
        {isSyncing && (
          <View className="mx-4 mb-3 p-3 bg-primary/10 border border-primary/30 rounded-xl">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-primary font-bold text-xs ml-2">
                  {t('inventory.syncingProducts')}
                </Text>
              </View>
              <Text className="text-primary font-bold text-xs">
                {syncProgress.current} {t('element.items')}
              </Text>
            </View>
          </View>
        )}

        {/* Last Sync Info */}
        {!isSyncing && lastSyncDate && allProductsCache.length > 0 && (
          <View className="mx-4 mb-3 p-2 bg-secondary/30 rounded-lg">
            <Text className="text-muted-foreground text-xs text-center">
              📦 {allProductsCache.length} {t('element.items')} • {t('inventory.lastSynced')}: {lastSyncDate}
            </Text>
          </View>
        )}

        {/* Offline Banner */}
        {isConnected === false && (
          <View className="mx-4 mb-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <Text className="text-orange-600 font-bold text-xs text-center">
              📡 {t('element.offline')} - {t('element.showingCachedData')}
            </Text>
          </View>
        )}

        {/* Results Count */}
        {!isLoading && !isSearching && products.length > 0 && (
          <View className="px-4 pb-3">
            <Text className="text-xs text-muted-foreground">
              {products.length} {t('inventory.productsFound')}
            </Text>
          </View>
        )}

        {/* Searching Indicator */}
        {isSearching && (
          <View className="px-4 pb-3">
            <Text className="text-xs text-primary">
              {t('general.searching')}...
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        {fetchError && products.length === 0 ? (
          <ConnectionError onRetry={onRefresh} message={fetchError} />
        ) : (
          <FlatList
            data={processedProducts}
            keyExtractor={(item, index) => `${item.id} -${index} `}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoading && page > 1 ? (
                <View className="py-6 items-center">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="text-xs text-muted-foreground mt-2">
                    {t('general.loadingMore')}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !isLoading ? (
                <View className="items-center justify-center py-20">
                  <View className="w-16 h-16 bg-secondary/30 rounded-full items-center justify-center mb-4">
                    <Search size={32} color={colors.mutedForeground} />
                  </View>
                  <Text className="text-muted-foreground text-base font-medium">
                    {searchText
                      ? t('inventory.noProductsFound')
                      : t('inventory.noProducts')}
                  </Text>
                  {searchText && (
                    <Text className="text-muted-foreground text-sm mt-1">
                      {t('inventory.tryDifferentSearch')}
                    </Text>
                  )}
                </View>
              ) : null
            }
          />
        )}

        {/* Initial Loading State or Searching */}
        {(isLoading || isSearching) && page === 1 && products.length === 0 && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-muted-foreground mt-4">
              {isSearching ? t('general.searching') : t('general.loading')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
