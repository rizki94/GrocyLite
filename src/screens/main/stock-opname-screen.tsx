import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  ToastAndroid,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { cn } from '../../lib/utils';
import { useFetch, useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted } from '../../utils/helpers';
import {
  Save,
  Trash2,
  Edit2,
  X,
  Search,
  Eye,
  Filter,
  CheckCircle,
  Unlock,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  Calendar,
  FileText,
  Cloud,
  RefreshCw,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { DatePicker } from '../../components/ui/date-picker';
import { Loading } from '../../components/ui/loading';
import moment from 'moment';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnection } from '../../hooks/use-connection';
import { useThemeColor } from '../../lib/colors';
import { useAuth } from '../../hooks/use-auth';
import { useDebounce } from '../../hooks/use-debounce';
import { useOffline } from '../../hooks/use-offline';

// Types
type RootStackParamList = {
  StockOpnameDetail: { invoice: string | number };
  StockOpnameList: undefined;
};

type StockOpnameScreenRouteProp = RouteProp<
  RootStackParamList,
  'StockOpnameDetail'
>;

interface Product {
  id: string;
  name: string;
  Unit: string;
  Unit2?: string;
  Unit3?: string;
  Unit4?: string;
  Rat1: number;
  Rat2: number;
  Rat3: number;
  Rat4: number;
  stock?: string | number;
}

interface InvoiceItem {
  id: string;
  product_id: string;
  product_name?: string;
  qty1: number;
  qty2: number;
  qty3: number;
  qty4: number;
  unit1?: string;
  unit2?: string;
  unit3?: string;
  unit4?: string;
  ratio1?: number;
  ratio2?: number;
  ratio3?: number;
  ratio4?: number;
  sys_stock?: string | number;
  hide?: boolean;
}

export function StockOpnameScreen() {
  const navigation = useNavigation();
  const colors = useThemeColor();
  const route = useRoute<StockOpnameScreenRouteProp>();
  const _invoice = route.params?.invoice || 0;

  const { apiClient } = useConnection();
  const { state } = useAuth();
  const { t } = useTranslation();
  const { isOffline, addToQueue, queue, processQueue, isSyncing } = useOffline();

  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(0); // 0: Open/Draft, 1: Approved
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Edit State
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentQty, setCurrentQty] = useState({
    qty1: 0,
    qty2: 0,
    qty3: 0,
    qty4: 0,
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const debouncedProductSearch = useDebounce(productSearch, 800);

  // Stock details modal
  const [showStockDetail, setShowStockDetail] = useState(false);
  const [stockDetailProduct, setStockDetailProduct] = useState<Product | null>(
    null,
  );
  const [refreshWarehouse, setRefreshWarehouse] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter Features
  const [hideEmpty, setHideEmpty] = useState(false);
  const [showSystemStock, setShowSystemStock] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [cachedProducts, setCachedProducts] = useState<Product[]>([]);

  const qtyInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load product cache for offline capability
  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem('products_full_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setCachedProducts(parsed.map((p: any) => ({
          id: p.id || p.PKey,
          name: p.Name || p.name,
          Unit: p.unit1 || p.Unit,
          Unit2: p.unit2 || p.Unit2,
          Unit3: p.unit3 || p.Unit3,
          Unit4: p.unit4 || p.Unit4,
          Rat1: p.ratio1 || p.Rat1 || 1,
          Rat2: p.ratio2 || p.Rat2 || 1,
          Rat3: p.ratio3 || p.Rat3 || 1,
          Rat4: p.ratio4 || p.Rat4 || 1,
          stock: p.Stock || p.stock || 0,
        })));
      }
    } catch (err) {
      console.error('Failed to load product cache', err);
    }
  };

  useEffect(() => {
    loadCache();
  }, []);

  // Robust Sync Mechanism
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const syncAllProducts = async () => {
    if (isOffline) {
      Alert.alert(t('element.error'), t('element.mustConnectInternet'));
      return;
    }

    try {
      setIsSyncingAll(true);
      let currentPage = 1;
      let allProducts: any[] = [];
      let hasMoreData = true;

      while (hasMoreData) {
        const response = await apiClient.get('/api/bridge/product_stock_list', {
          params: { search: '', page: currentPage, limit: 100 },
        });
        const pageData = Array.isArray(response.data) ? response.data : response.data?.data;

        if (Array.isArray(pageData) && pageData.length > 0) {
          allProducts = [...allProducts, ...pageData];
          currentPage++;
          hasMoreData = pageData.length === 100;
        } else {
          hasMoreData = false;
        }
      }

      const mapped = allProducts.map((p: any) => ({
        id: p.id || p.PKey,
        name: p.Name,
        Unit: p.unit1,
        Unit2: p.unit2,
        Unit3: p.unit3,
        Unit4: p.unit4,
        Rat1: p.ratio1 || 1,
        Rat2: p.ratio2 || 1,
        Rat3: p.ratio3 || 1,
        Rat4: p.ratio4 || 1,
        stock: p.Stock || 0,
      }));

      setCachedProducts(mapped);
      await AsyncStorage.setItem('products_full_cache', JSON.stringify(allProducts));
      await AsyncStorage.setItem('products_last_sync', new Date().toDateString());

      if (mapped.length > 0) {
        Alert.alert(t('element.success'), `Saved ${mapped.length} products to cache.`);
      }
    } catch (e) {
      console.error('Sync failed', e);
      Alert.alert(t('element.error'), 'Failed to sync product database');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const hasCheckedSync = useRef(false);

  // Background sync once per day
  useEffect(() => {
    const checkAndSync = async () => {
      if (isOffline || hasCheckedSync.current) return;
      hasCheckedSync.current = true;

      try {
        const lastSync = await AsyncStorage.getItem('products_last_sync');
        const today = new Date().toDateString();

        if (lastSync !== today) {
          syncAllProducts();
        }
      } catch (e) {
        console.error('Failed to check sync status', e);
      }
    };

    checkAndSync();
  }, [isOffline]);

  // Helper: Format Split Stock
  const formatSplitStock = (
    total: number,
    p: Product | Partial<Product> | undefined,
  ) => {
    if (!p) return '0';
    const rat1 = p.Rat1 || 1;
    const rat2 = p.Rat2 || 1;
    const rat3 = p.Rat3 || 1;
    const rat4 = p.Rat4 || 1;

    const q1 = Math.trunc(total / rat1);
    const r1 = total % rat1;
    const q2 = Math.trunc(r1 / rat2);
    const r2 = r1 % rat2;
    const q3 = Math.trunc(r2 / rat3);
    const r3 = r2 % rat3;
    const q4 = Math.trunc(r3 / rat4);

    let parts = [];
    if (q1 !== 0 || (!p.Unit2 && !p.Unit3 && !p.Unit4))
      parts.push(`${q1} ${p.Unit}`);
    if (p.Unit2 && q2 !== 0) parts.push(`${q2} ${p.Unit2}`);
    if (p.Unit3 && q3 !== 0) parts.push(`${q3} ${p.Unit3}`);
    if (p.Unit4 && q4 !== 0) parts.push(`${q4} ${p.Unit4}`);

    return parts.length > 0 ? parts.join(' ') : `0 ${p.Unit}`;
  };

  // Auto-focus quantity input when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setTimeout(() => {
        qtyInputRef.current?.focus();
      }, 150);
    }
  }, [selectedProduct]);

  // Load Data via API
  const {
    data: fetchInvoice,
    isLoading: invoiceLoading,
  } = useFetchWithParams(
    '/api/stock_opname/show',
    { params: { invoice: _invoice } },
    _invoice.toString(),
  );


  const {
    data: stockByWarehouse,
    isLoading: warehouseLoading,
    refetch: refetchWarehouseData,
  } = useFetchWithParams(
    '/api/bridge/stock_system_by_warehouse',
    { params: { product_id: stockDetailProduct?.id } },
    stockDetailProduct?.id || '',
    refreshWarehouse,
  );

  const { data: stock, isLoading: stockLoading } = useFetch(
    '/api/bridge/stock_system',
  );

  // Sync products list from cache for a truly instant experience
  const products = useMemo(() => {
    const lowerQuery = productSearch.toLowerCase().trim();
    if (!lowerQuery) {
      return cachedProducts.slice(0, 50);
    }

    return cachedProducts.filter(p =>
      p.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 50);
  }, [productSearch, cachedProducts]);

  // Initialize Invoice Data
  useEffect(() => {
    if (_invoice && fetchInvoice?.invoice) {
      setDate(new Date(fetchInvoice.invoice.date));
      setNotes(fetchInvoice.invoice.notes || '');
      setStatus(fetchInvoice.invoice.status || 0);
      setItems(fetchInvoice.invoiceItems || []);
    }
  }, [fetchInvoice, _invoice]);

  const handleSave = async () => {
    try {
      const payload = {
        invoice: { date: dateFormatted(date), notes, user_id: state.user?.id },
        invoiceItems: items.map(item => ({
          ...item,
          sys_stock:
            item.sys_stock !== undefined
              ? item.sys_stock
              : stock?.find((s: any) => s.PKey === item.product_id)?.Stock,
        })),
      };

      if (isOffline) {
        await addToQueue(
          _invoice ? `/api/stock_opname/${_invoice}` : '/api/stock_opname/create',
          _invoice ? 'PUT' : 'POST',
          payload,
          {},
          _invoice ? `Update SO #${_invoice}` : 'Create Stock Opname'
        );
        ToastAndroid.show(t('element.savedOffline'), ToastAndroid.SHORT);
        navigation.goBack();
        return;
      }

      let response;
      if (_invoice) {
        response = await apiClient.put(`/api/stock_opname/${_invoice}`, payload);
      } else {
        response = await apiClient.post('/api/stock_opname/create', payload);
      }

      if (response.data.status === 200) {
        ToastAndroid.show(t('warehouse.stockOpname.savedSuccess'), ToastAndroid.SHORT);
        navigation.goBack();
      } else {
        ToastAndroid.show(response.data.message || t('warehouse.stockOpname.errorSaving'), ToastAndroid.SHORT);
      }
    } catch (e: any) {
      ToastAndroid.show(e.message || t('error.serverNotAvailable'), ToastAndroid.SHORT);
    }
  };

  const handleApprove = async () => {
    Alert.alert(
      t('warehouse.stockOpname.alertApproveTitle'),
      t('warehouse.stockOpname.alertApproveContent'),
      [
        { text: t('element.cancel'), style: 'cancel' },
        {
          text: t('approve.salesApprove.approve'),
          onPress: async () => {
            try {
              if (isOffline) {
                await addToQueue('/api/stock_opname/approve', 'POST', { invoice: _invoice }, {}, `Approve SO #${_invoice}`);
                ToastAndroid.show(t('element.savedOffline'), ToastAndroid.SHORT);
                setStatus(1);
                return;
              }
              const response = await apiClient.post('/api/stock_opname/approve', { invoice: _invoice });
              if (response.data.status === 200) {
                ToastAndroid.show(t('approve.salesApprove.approved'), ToastAndroid.SHORT);
                setStatus(1);
              } else {
                ToastAndroid.show(t('approve.salesApprove.failedUpdateStatus'), ToastAndroid.SHORT);
              }
            } catch (e: any) {
              ToastAndroid.show(e.message || t('error.serverNotAvailable'), ToastAndroid.SHORT);
            }
          },
        },
      ],
    );
  };

  const handleOpen = async () => {
    Alert.alert(
      t('warehouse.stockOpname.alertReopenTitle'),
      t('warehouse.stockOpname.alertReopenContent'),
      [
        { text: t('element.cancel'), style: 'cancel' },
        {
          text: t('general.open'),
          onPress: async () => {
            try {
              if (isOffline) {
                await addToQueue('/api/stock_opname/open', 'POST', { invoice: _invoice }, {}, `Reopen SO #${_invoice}`);
                ToastAndroid.show(t('element.savedOffline'), ToastAndroid.SHORT);
                setStatus(0);
                return;
              }
              const response = await apiClient.post('/api/stock_opname/open', { invoice: _invoice });
              if (response.data.status === 200) {
                ToastAndroid.show(t('general.open'), ToastAndroid.SHORT);
                setStatus(0);
              } else {
                ToastAndroid.show(t('approve.salesApprove.failedUpdateStatus'), ToastAndroid.SHORT);
              }
            } catch (e: any) {
              ToastAndroid.show(e.message || t('error.serverNotAvailable'), ToastAndroid.SHORT);
            }
          },
        },
      ],
    );
  };

  const addItem = () => {
    if (!selectedProduct) return;

    const existingIndex = items.findIndex(i => i.product_id === selectedProduct.id);
    if (existingIndex >= 0) {
      ToastAndroid.show(`${t('warehouse.stockOpname.itemAlreadyAdded')} ${existingIndex + 1}`, ToastAndroid.SHORT);
      return;
    }

    const newItem: InvoiceItem = {
      id: uuid.v4().toString(),
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      qty1: currentQty.qty1,
      qty2: currentQty.qty2,
      qty3: currentQty.qty3,
      qty4: currentQty.qty4,
      unit1: selectedProduct.Unit,
      unit2: selectedProduct.Unit2,
      unit3: selectedProduct.Unit3,
      unit4: selectedProduct.Unit4,
      ratio1: selectedProduct.Rat1,
      ratio2: selectedProduct.Rat2,
      ratio3: selectedProduct.Rat3,
      ratio4: selectedProduct.Rat4,
    };

    setItems([...items, newItem]);
    resetForm();
    Keyboard.dismiss();
  };

  const updateItem = () => {
    if (!editingId || !selectedProduct) return;

    setItems(items.map(item =>
      item.id === editingId
        ? {
          ...item,
          qty1: currentQty.qty1,
          qty2: currentQty.qty2,
          qty3: currentQty.qty3,
          qty4: currentQty.qty4,
        }
        : item,
    ));

    resetForm();
    setIsEdit(false);
    setEditingId(null);
    Keyboard.dismiss();
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const startEdit = (item: InvoiceItem) => {
    const prod = products.find(p => p.id === item.product_id) || {
      id: item.product_id,
      name: item.product_name || 'Unknown',
      Unit: item.unit1 || t('element.unit'),
      Unit2: item.unit2,
      Unit3: item.unit3,
      Unit4: item.unit4,
      Rat1: item.ratio1 || 1,
      Rat2: item.ratio2 || 1,
      Rat3: item.ratio3 || 1,
      Rat4: item.ratio4 || 1,
    };

    setSelectedProduct(prod as Product);
    setCurrentQty({
      qty1: item.qty1,
      qty2: item.qty2,
      qty3: item.qty3,
      qty4: item.qty4,
    });
    setEditingId(item.id);
    setIsEdit(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setCurrentQty({ qty1: 0, qty2: 0, qty3: 0, qty4: 0 });
    setProductSearch('');
    setShowSearchResults(false);
  };

  const getSystemStock = (productId: string) => {
    return stock?.find((s: any) => s.PKey === productId)?.Stock || 0;
  };

  const calculateTotal = (item: InvoiceItem) => {
    return (
      item.qty1 * (item.ratio1 || 0) +
      item.qty2 * (item.ratio2 || 0) +
      item.qty3 * (item.ratio3 || 0) +
      item.qty4 * (item.ratio4 || 0)
    );
  };

  const getDifference = (item: InvoiceItem) => {
    const total = calculateTotal(item);
    const sysStock = item.sys_stock !== undefined ? Number(item.sys_stock) : getSystemStock(item.product_id);
    return total - sysStock;
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const prodName = item.product_name || products.find(p => p.id === item.product_id)?.name || '';
      const matchesSearch = prodName.toLowerCase().includes(searchQuery.toLowerCase());
      if (hideEmpty) {
        const diff = getDifference(item);
        return matchesSearch && diff !== 0;
      }
      return matchesSearch;
    }).map(item => ({
      ...item,
      product_name: item.product_name || products.find(p => p.id === item.product_id)?.name || 'Unknown',
    }));
  }, [items, searchQuery, hideEmpty, products, stock]);

  const getProductSource = (productId: string) => {
    return stock?.find((s: any) => s.PKey === productId)?.Source || '';
  };

  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Dynamic Header */}
      <View className="bg-card border-b border-border shadow-md">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full">
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View className="flex-1 ml-1 overflow-hidden">
            <Text className="text-lg font-black text-foreground" numberOfLines={1}>
              {_invoice ? `SO #${_invoice}` : t('warehouse.stockOpname.newOpname')}
            </Text>
            <Pressable onPress={() => setShowDateModal(true)} className="flex-row items-center opacity-60">
              <Calendar size={10} color={colors.foreground} className="mr-1" />
              <Text className="ml-1 text-[10px] font-bold text-foreground">{moment(date).format('DD MMM YYYY')}</Text>
              <Text className="mx-1 text-foreground">•</Text>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-foreground" numberOfLines={1}>
                  {notes || t('warehouse.stockOpname.tapToAddNotes')}
                </Text>
              </View>
            </Pressable>
          </View>
          <View className="flex-row items-center gap-1">
            <TouchableOpacity onPress={() => setShowOptions(!showOptions)} className={cn("p-2 rounded-xl", showOptions && "bg-primary/10")}>
              <Filter size={20} color={showOptions ? colors.primary : colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => syncAllProducts()}
              disabled={isSyncingAll}
              className={cn("p-2", isSyncingAll && "opacity-50")}
            >
              <RotateCcw size={20} color={colors.foreground} className={cn(isSyncingAll && "animate-spin")} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Options Menu */}
        {showOptions && (
          <View className="px-4 pb-4 flex-row gap-2">
            <Button
              variant={showSystemStock ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-10 rounded-xl"
              onPress={() => setShowSystemStock(!showSystemStock)}
              label={t('warehouse.stockOpname.system')}
              leftIcon={<Eye size={12} color={showSystemStock ? "#fff" : colors.primary} />}
            />
            <Button
              variant={hideEmpty ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-10 rounded-xl"
              onPress={() => setHideEmpty(!hideEmpty)}
              label={t('warehouse.stockOpname.difference')}
              leftIcon={<Filter size={12} color={hideEmpty ? "#fff" : colors.primary} />}
            />
            <Button
              variant={showSearch ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-10 rounded-xl"
              onPress={() => setShowSearch(!showSearch)}
              label={t('general.search')}
              leftIcon={<Search size={12} color={showSearch ? "#fff" : colors.primary} />}
            />
          </View>
        )}

        {/* Unified Quick Search Bar - The Primary Interaction Point */}
        {status === 0 && !isEdit && (
          <View className="px-4 pb-4">
            <View className="relative">
              <Input
                placeholder={t('warehouse.stockOpname.searchProductPlaceholder')}
                value={productSearch}
                onChangeText={(v) => {
                  setProductSearch(v);
                  setShowSearchResults(v.length > 0);
                }}
                onFocus={() => productSearch.length > 0 && setShowSearchResults(true)}
                className="h-14 rounded-2xl bg-secondary border-input"
                leftIcon={<Search size={20} color={colors.primary} className="opacity-60" />}
                rightIcon={productSearch ? (
                  <TouchableOpacity onPress={() => resetForm()}>
                    <X size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ) : null}
              />
            </View>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      <View className="flex-1">
        {/* Instant Search Results Overlay */}
        {showSearchResults && status === 0 && (
          <View className="absolute top-0 left-0 right-0 bottom-0 bg-background z-50">
            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
              <View className="px-4 py-2 bg-secondary/5 flex-row items-center justify-between">
                <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {t('warehouse.stockOpname.selectProduct')}
                </Text>
                {isSyncingAll && (
                  <View className="animate-pulse">
                    <Text className="text-[10px] text-primary font-bold">
                      SYNCING DATABASE...
                    </Text>
                  </View>
                )}
              </View>

              {products.length === 0 && !isSyncingAll ? (
                <View className="py-20 items-center justify-center">
                  <Search size={40} color={colors.mutedForeground} className="opacity-20 mb-4" />
                  <Text className="text-muted-foreground font-bold">No products found</Text>
                  {!isOffline && (
                    <TouchableOpacity
                      onPress={() => syncAllProducts()}
                      className="mt-4 px-4 py-2 bg-primary rounded-xl"
                    >
                      <Text className="text-white text-xs font-bold">Sync Full Database</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                products.map(prod => {
                  const source = getProductSource(prod.id);
                  return (
                    <TouchableOpacity
                      key={prod.id}
                      onPress={() => {
                        setSelectedProduct(prod);
                        setProductSearch(prod.name);
                        setShowSearchResults(false);
                        Keyboard.dismiss();
                      }}
                      className="px-4 py-3 border-b border-border/50 flex-row items-center justify-between active:bg-primary/5"
                    >
                      <View className="flex-1 mr-4">
                        <View className="flex-row items-center flex-wrap gap-1.5">
                          <Text className="font-bold text-foreground text-sm flex-1">{prod.name}</Text>
                          {source && (
                            <View className={cn("px-1.5 py-0.5 rounded-md", source === 'PKP' ? 'bg-yellow-500/10' : 'bg-blue-500/10')}>
                              <Text className={cn("text-[8px] font-black uppercase", source === 'PKP' ? 'text-yellow-600' : 'text-blue-600')}>
                                {source}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
              <View className="h-40" />
            </ScrollView>
          </View>
        )}

        {/* Selected Product Quantity Input Card */}
        {status === 0 && selectedProduct && (
          <View className="bg-card border-b border-border shadow-2xl p-5 z-40">
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-1 mr-4">
                <Text className="font-black text-primary text-lg" numberOfLines={2}>{selectedProduct.name}</Text>
                <View className="flex-row items-center mt-1">
                  <View className="bg-primary/10 px-2 py-0.5 rounded-md mr-2">
                    <Text className="text-[9px] font-black text-primary uppercase">
                      {isEdit ? t('element.editing') : t('element.adding')}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {t('element.stock')}: {isOffline ? '--' : formatSplitStock(Number(selectedProduct.stock || 0), selectedProduct)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={resetForm} className="p-2 bg-secondary/10 rounded-full">
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-3 mb-6">
              {[1, 2, 3, 4].map(num => {
                const unit = selectedProduct[`Unit${num === 1 ? '' : num}` as keyof Product];
                if (!unit && num > 1) return null;
                return (
                  <View key={num} className="flex-1 min-w-[75px]">
                    <Text className="text-[10px] font-black text-muted-foreground uppercase mb-1.5 ml-1 tracking-tighter">{String(unit)}</Text>
                    <Input
                      ref={num === 1 ? qtyInputRef : undefined}
                      keyboardType="numeric"
                      selectTextOnFocus
                      value={currentQty[`qty${num}` as keyof typeof currentQty] === 0 ? '' : currentQty[`qty${num}` as keyof typeof currentQty].toString()}
                      onChangeText={v => setCurrentQty({ ...currentQty, [`qty${num}`]: Number(v) || 0 })}
                      placeholder="0"
                      className="h-16 text-center font-black text-xl rounded-2xl bg-muted/30 border-input"
                    />
                  </View>
                );
              })}
            </View>

            <Button
              label={isEdit ? t('element.updateItem') : t('element.addItemToList')}
              onPress={isEdit ? updateItem : addItem}
              className="w-full h-14 rounded-2xl shadow-lg shadow-primary/30"
              labelClasses="font-black uppercase tracking-widest"
            />
          </View>
        )}

        {/* Main List */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Offline & Sync Status Banners */}
          {isOffline && (
            <View className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex-row items-center justify-center">
              <Cloud size={16} color="#f97316" className="mr-2" />
              <Text className="text-orange-600 font-bold text-sm">
                {t('element.offline')} • {t('element.showingCachedData')}
              </Text>
            </View>
          )}

          {!isOffline && queue.length > 0 && (
            <TouchableOpacity
              onPress={() => processQueue()}
              disabled={isSyncing}
              className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-2xl flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <RefreshCw size={18} color={colors.primary} className={cn("mr-3", isSyncing && "animate-spin")} />
                <View>
                  <Text className="text-primary font-bold text-sm">{t('element.pendingActions')} ({queue.length})</Text>
                  <Text className="text-primary/60 text-[10px] uppercase font-black">{isSyncing ? 'Syncing...' : t('element.syncNow')}</Text>
                </View>
              </View>
              <ChevronDown size={16} color={colors.primary} className="-rotate-90 opacity-50" />
            </TouchableOpacity>
          )}

          {/* List Search Filter */}
          {showSearch && (
            <View className="mb-4">
              <Input
                placeholder={t('warehouse.stockOpname.filterListedItems')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="h-11 bg-muted/50 border-0 rounded-xl"
                leftIcon={<Search size={16} color={colors.mutedForeground} />}
              />
            </View>
          )}

          {/* The Actual List of Items */}
          {filteredItems.length === 0 ? (
            <View className="py-20 items-center justify-center opacity-30">
              <FileText size={64} color={colors.mutedForeground} />
              <Text className="mt-4 font-bold text-muted-foreground">{t('general.noData')}</Text>
            </View>
          ) : (
            filteredItems.map((item, index) => {
              const source = getProductSource(item.product_id);
              const diffValue = getDifference(item);
              const sysValue = item.sys_stock !== undefined ? Number(item.sys_stock) : getSystemStock(item.product_id);
              const totalPhys = calculateTotal(item);

              const prodInfo = {
                id: item.product_id,
                name: item.product_name || 'Unknown',
                Unit: item.unit1 || '', Unit2: item.unit2, Unit3: item.unit3, Unit4: item.unit4,
                Rat1: item.ratio1 || 1, Rat2: item.ratio2 || 1, Rat3: item.ratio3 || 1, Rat4: item.ratio4 || 1,
              };

              return (
                <View key={item.id} className="mb-2 bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                  <View className="flex-row p-3 items-center">
                    <View className="bg-secondary/40 h-8 w-8 rounded-xl items-center justify-center mr-2.5">
                      <Text className="font-black text-muted-foreground text-[10px]">{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setStockDetailProduct(prodInfo as Product);
                          setShowStockDetail(true);
                        }}
                      >
                        <View className="flex-row items-center flex-wrap gap-1.5">
                          <Text className="font-bold text-foreground text-[13px] leading-tight" numberOfLines={2}>
                            {item.product_name}
                          </Text>
                          {source && (
                            <View className={cn("px-1.5 py-0.5 rounded-md", source === 'PKP' ? 'bg-yellow-500/10' : 'bg-blue-500/10')}>
                              <Text className={cn("text-[8px] font-black uppercase", source === 'PKP' ? 'text-yellow-600' : 'text-blue-600')}>
                                {source}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                    {status === 0 && (
                      <View className="flex-row gap-1.5">
                        <TouchableOpacity onPress={() => startEdit(item)} className="p-2.5 bg-blue-500/10 rounded-xl">
                          <Edit2 size={14} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteItem(item.id)} className="p-2.5 bg-red-500/10 rounded-xl">
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View className="flex-row bg-secondary/5 px-2 py-2 border-t border-border/30">
                    <View className="flex-1 items-center">
                      <Text className="text-[8px] font-black text-muted-foreground uppercase opacity-60 mb-0.5">{t('warehouse.stockOpname.physical')}</Text>
                      <Text className="text-[11px] font-black text-foreground">{formatSplitStock(totalPhys, prodInfo)}</Text>
                    </View>
                    {showSystemStock && (
                      <>
                        <View className="flex-1 px-1 border-l border-border/30 items-center">
                          <Text className="text-[8px] font-black text-muted-foreground uppercase opacity-60 mb-0.5">{t('warehouse.stockOpname.system')}</Text>
                          <Text className="text-[11px] font-bold text-muted-foreground/80">{formatSplitStock(sysValue, prodInfo)}</Text>
                        </View>
                        <View className="flex-1 pl-1 border-l border-border/30 items-center">
                          <Text className="text-[8px] font-black text-muted-foreground uppercase opacity-60 mb-0.5">{t('warehouse.stockOpname.difference')}</Text>
                          <Text className={cn("text-[11px] font-black", diffValue < 0 ? 'text-red-500' : 'text-green-500')}>
                            {diffValue > 0 ? '+' : ''}{formatSplitStock(diffValue, prodInfo)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View className="h-40" />
        </ScrollView>
      </View>

      {/* Floating Action Buttons */}
      <View className="absolute right-6 flex-row gap-3" style={{ bottom: insets.bottom + 24 }}>
        {Boolean(_invoice && status === 0) && (
          <TouchableOpacity onPress={handleApprove} className="bg-green-600 p-5 rounded-full shadow-2xl items-center justify-center">
            <CheckCircle size={28} color="#fff" />
          </TouchableOpacity>
        )}
        {Boolean(_invoice && status === 1) && (
          <TouchableOpacity onPress={handleOpen} className="bg-yellow-600 p-5 rounded-full shadow-2xl items-center justify-center">
            <Unlock size={28} color="#fff" />
          </TouchableOpacity>
        )}
        {status === 0 && (
          <TouchableOpacity onPress={handleSave} className="bg-primary p-5 rounded-full shadow-2xl items-center justify-center">
            <Save size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-[40px] p-8 shadow-2xl">
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-2xl font-black text-foreground">{t('warehouse.stockOpname.opnameDetails')}</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)} className="p-2 bg-secondary/10 rounded-full">
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View className="mb-6">
              <Text className="text-[10px] font-black text-muted-foreground uppercase mb-2 ml-1">{t('warehouse.stockOpname.transactionDate')}</Text>
              <DatePicker value={date} onChange={setDate} />
            </View>
            <View className="mb-10">
              <Text className="text-[10px] font-black text-muted-foreground uppercase mb-2 ml-1">{t('warehouse.stockOpname.notesRemarks')}</Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder={t('warehouse.stockOpname.addNotesPlaceholder')}
                multiline
                className="min-h-[100px] text-base bg-muted/30 border border-input rounded-2xl px-4"
              />
            </View>
            <Button
              label={t('warehouse.stockOpname.saveDetails')}
              onPress={() => setShowDateModal(false)}
              className="h-16 rounded-3xl shadow-xl shadow-primary/20"
              labelClasses="font-black uppercase tracking-[2px]"
            />
          </View>
        </View>
      </Modal>

      {/* Stock Detail Modal */}
      <Modal visible={showStockDetail} transparent animationType="slide" onRequestClose={() => setShowStockDetail(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-card rounded-t-3xl overflow-hidden shadow-2xl max-h-[85%]">
            <View className="p-6 border-b border-border flex-row justify-between items-center">
              <View>
                <Text className="text-xl font-black text-foreground">{t('warehouse.stockOpname.stockDetails')}</Text>
                <Text className="text-primary font-bold text-sm mt-0.5">{stockDetailProduct?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStockDetail(false)} className="p-2 bg-secondary/10 rounded-full">
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4 max-h-[500px]">
              {warehouseLoading ? <Loading isLoading={true} /> : !stockByWarehouse || stockByWarehouse.length === 0 ? (
                <View className="py-20 items-center">
                  <Text className="text-muted-foreground mb-6 font-bold">{t('warehouse.stockOpname.noStockInfo')}</Text>
                  <Button label={t('warehouse.stockOpname.retry')} onPress={() => refetchWarehouseData()} variant="outline" />
                </View>
              ) : (
                stockByWarehouse.map((wh: any, idx: number) => (
                  <View key={idx} className="flex-row border-b border-border/50 py-4 px-2 items-center">
                    <View className="flex-[2]">
                      <Text className="text-sm text-foreground font-black">{wh.Descr}</Text>
                      <Text className={cn("text-[10px] font-black uppercase mt-0.5", wh.Source === 'PKP' ? 'text-yellow-600' : 'text-blue-600')}>{wh.Source}</Text>
                    </View>
                    <Text className="flex-[3] text-sm text-right font-bold text-foreground">
                      {formatSplitStock(Number(wh.Stock), stockDetailProduct as Product)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <View className="p-6 pb-10">
              <Button label={t('general.close')} onPress={() => setShowStockDetail(false)} className="rounded-2xl" />
            </View>
          </View>
        </View>
      </Modal>

      {(invoiceLoading || stockLoading) && <Loading isLoading={true} />}
    </View>
  );
}
