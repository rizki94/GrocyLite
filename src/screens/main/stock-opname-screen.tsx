import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import {
  SafeAreaView,
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
  EyeOff,
  Filter,
  CheckCircle,
  Unlock,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Calendar,
  FileText,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DatePicker } from '../../components/ui/date-picker';
import { Loading } from '../../components/ui/loading';
import moment from 'moment';
import uuid from 'react-native-uuid';
import { useConnection } from '../../hooks/use-connection';
import { useThemeColor } from '../../lib/colors';
import { useAuth } from '../../hooks/use-auth';
import { useDebounce } from '../../hooks/use-debounce';

// Types
type RootStackParamList = {
  StockOpnameDetail: { invoice: string | number };
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

  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(0); // 0: Open/Draft, 1: Approved
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

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
  const [showProductModal, setShowProductModal] = useState(false);
  const debouncedProductSearch = useDebounce(productSearch, 500);

  // Stock details modal
  const [showStockDetail, setShowStockDetail] = useState(false);
  const [stockDetailProduct, setStockDetailProduct] = useState<Product | null>(
    null,
  );
  const [refreshWarehouse, setRefreshWarehouse] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New Features
  const [hideEmpty, setHideEmpty] = useState(false);
  const [showSystemStock, setShowSystemStock] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

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

  // Load Data
  const {
    data: fetchInvoice,
    isLoading: invoiceLoading,
    refetch: refetchInvoice,
  } = useFetchWithParams(
    'api/stock_opname/show',
    { params: { invoice: _invoice } },
    _invoice.toString(),
  );

  const { data: fetchedProducts, isLoading: productsLoading } =
    useFetchWithParams(
      'api/bridge/product_stock_list',
      { params: { search: debouncedProductSearch, limit: 50 } },
      debouncedProductSearch,
      refreshing,
    );

  const {
    data: stockByWarehouse,
    isLoading: warehouseLoading,
    refetch: refetchWarehouseData,
  } = useFetchWithParams(
    'api/bridge/stock_system_by_warehouse',
    { params: { product_id: stockDetailProduct?.id } },
    stockDetailProduct?.id || '',
    refreshWarehouse,
  );

  const { data: stock, isLoading: stockLoading } = useFetch(
    'api/bridge/stock_system',
  );

  useEffect(() => {
    const productListData = Array.isArray(fetchedProducts)
      ? fetchedProducts
      : fetchedProducts?.data;

    if (Array.isArray(productListData)) {
      setProducts(
        productListData.map(p => ({
          ...p,
          id: p.id,
          name: p.Name,
          Unit: p.unit1,
          Unit2: p.unit2,
          Unit3: p.unit3,
          Unit4: p.unit4,
          Rat1: p.ratio1,
          Rat2: p.ratio2,
          Rat3: p.ratio3,
          Rat4: p.ratio4,
          stock: p.Stock,
        })),
      );
    }
  }, [fetchedProducts]);

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

      let response;
      if (_invoice) {
        response = await apiClient.put(`api/stock_opname/${_invoice}`, payload);
      } else {
        response = await apiClient.post('api/stock_opname/create', payload);
      }

      if (response.data.status === 200) {
        ToastAndroid.show(
          t('warehouse.stockOpname.savedSuccess'),
          ToastAndroid.SHORT,
        );
        navigation.goBack();
      } else {
        ToastAndroid.show(
          response.data.message || t('warehouse.stockOpname.errorSaving'),
          ToastAndroid.SHORT,
        );
      }
    } catch (e: any) {
      ToastAndroid.show(
        e.message || t('error.serverNotAvailable'),
        ToastAndroid.SHORT,
      );
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
              const response = await apiClient.post(
                'api/stock_opname/approve',
                {
                  invoice: _invoice,
                },
              );
              if (response.data.status === 200) {
                ToastAndroid.show(
                  t('approve.salesApprove.approved'),
                  ToastAndroid.SHORT,
                );
                setStatus(1);
              } else {
                ToastAndroid.show(
                  t('approve.salesApprove.failedUpdateStatus'),
                  ToastAndroid.SHORT,
                );
              }
            } catch (e: any) {
              ToastAndroid.show(
                e.message || t('error.serverNotAvailable'),
                ToastAndroid.SHORT,
              );
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
              const response = await apiClient.post('api/stock_opname/open', {
                invoice: _invoice,
              });
              if (response.data.status === 200) {
                ToastAndroid.show(t('general.open'), ToastAndroid.SHORT);
                setStatus(0);
              } else {
                ToastAndroid.show(
                  t('approve.salesApprove.failedUpdateStatus'),
                  ToastAndroid.SHORT,
                );
              }
            } catch (e: any) {
              ToastAndroid.show(
                e.message || t('error.serverNotAvailable'),
                ToastAndroid.SHORT,
              );
            }
          },
        },
      ],
    );
  };

  const addItem = () => {
    if (!selectedProduct) return;

    const existingIndex = items.findIndex(
      i => i.product_id === selectedProduct.id,
    );
    if (existingIndex >= 0) {
      ToastAndroid.show(
        `${t('warehouse.stockOpname.itemAlreadyAdded')} ${existingIndex + 1}`,
        ToastAndroid.SHORT,
      );
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
  };

  const updateItem = () => {
    if (!editingId || !selectedProduct) return;

    setItems(
      items.map(item =>
        item.id === editingId
          ? {
              ...item,
              qty1: currentQty.qty1,
              qty2: currentQty.qty2,
              qty3: currentQty.qty3,
              qty4: currentQty.qty4,
            }
          : item,
      ),
    );

    resetForm();
    setIsEdit(false);
    setEditingId(null);
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const scrollViewRef = useRef<ScrollView>(null);

  const startEdit = (item: InvoiceItem) => {
    // Reconstruct product from item if not in fetched products
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

    setSelectedProduct(prod);
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
    const sysStock =
      item.sys_stock !== undefined
        ? Number(item.sys_stock)
        : getSystemStock(item.product_id);
    return total - sysStock;
  };

  const filteredItems = items
    .filter(item => {
      const prodName =
        item.product_name ||
        products.find(p => p.id === item.product_id)?.name ||
        '';
      const matchesSearch = prodName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      if (hideEmpty) {
        const diff = getDifference(item);
        return matchesSearch && diff !== 0;
      }

      return matchesSearch;
    })
    .map(item => ({
      ...item,
      product_name:
        item.product_name ||
        products.find(p => p.id === item.product_id)?.name ||
        'Unknown',
    }));

  const getProductSource = (productId: string) => {
    return stock?.find((s: any) => s.PKey === productId)?.Source || '';
  };

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
      {/* Top Navigation */}
      <View className="bg-card border-b border-border shadow-sm">
        <View className="flex-row items-center justify-between px-4 py-2">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="p-2 -ml-2 rounded-full active:bg-secondary/20"
            >
              <ArrowLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-foreground ml-1">
              {_invoice
                ? `SO #${_invoice}`
                : t('warehouse.stockOpname.newOpname')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              const newItems = items.map(item => ({
                ...item,
                sys_stock: undefined,
              }));
              setItems(newItems);
            }}
            className="p-2 rounded-full active:bg-secondary/20"
          >
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Row 1: Summary & Filter Button */}
        <View className="px-4 pb-3 flex-row gap-2 items-center">
          <TouchableOpacity
            onPress={() => setShowDateModal(true)}
            className="flex-1 bg-secondary/10 rounded-xl px-3 py-1.5 border border-border/30 h-14 justify-center"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row gap-2 items-center mb-0.5">
                  <Calendar size={10} color={colors.primary} className="mr-1" />
                  <Text className="text-[10px] font-bold text-foreground">
                    {moment(date).format('DD MMM YYYY')}
                  </Text>
                </View>
                <View className="flex-row gap-2 items-center">
                  <FileText
                    size={10}
                    color={colors.mutedForeground}
                    className="mr-1"
                  />
                  <Text
                    className="text-[10px] text-muted-foreground"
                    numberOfLines={1}
                  >
                    {notes || t('warehouse.stockOpname.tapToAddNotes')}
                  </Text>
                </View>
              </View>
              <View className="ml-1 opacity-50">
                <Edit2 size={12} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowOptions(!showOptions)}
            className={`p-3 rounded-xl border h-14 w-14 items-center justify-center ${showOptions ? 'bg-primary border-primary' : 'bg-card border-border shadow-sm'}`}
          >
            <Filter size={22} color={showOptions ? '#fff' : colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter Options Menu */}
        {showOptions && (
          <View className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <View className="bg-secondary/10 rounded-2xl p-2 flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowSystemStock(!showSystemStock)}
                className={`flex-1 flex-row gap-2 items-center justify-center py-2.5 rounded-xl border ${
                  showSystemStock
                    ? 'bg-green-600 border-green-600'
                    : 'bg-background border-border'
                }`}
              >
                <Eye
                  size={16}
                  color={showSystemStock ? '#fff' : colors.green}
                  className="mr-2"
                />
                <Text
                  className={`text-[10px] font-bold ${showSystemStock ? 'text-white' : 'text-foreground'}`}
                >
                  {t('warehouse.stockOpname.system').toUpperCase()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setHideEmpty(!hideEmpty)}
                className={`flex-1 flex-row gap-2 items-center justify-center py-2.5 rounded-xl border ${
                  hideEmpty
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-background border-border'
                }`}
              >
                <Filter
                  size={16}
                  color={hideEmpty ? '#fff' : colors.indigo}
                  className="mr-2"
                />
                <Text
                  className={`text-[10px] font-bold ${hideEmpty ? 'text-white' : 'text-foreground'}`}
                >
                  {t('warehouse.stockOpname.difference').toUpperCase()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSearch(!showSearch)}
                className={`flex-1 flex-row gap-2 items-center justify-center py-2.5 rounded-xl border ${
                  showSearch
                    ? 'bg-primary border-primary'
                    : 'bg-background border-border'
                }`}
              >
                <Search
                  size={16}
                  color={showSearch ? '#fff' : colors.primary}
                  className="mr-2"
                />
                <Text
                  className={`text-[10px] font-bold ${showSearch ? 'text-white' : 'text-foreground'}`}
                >
                  {t('general.search').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Row 2: Product Select - Hide when editing to avoid confusion */}
        {status === 0 && !isEdit && (
          <View className="px-4 pb-3">
            <TouchableOpacity
              onPress={() => {
                setIsEdit(false);
                setEditingId(null);
                setShowProductModal(true);
              }}
              className="flex-row items-center h-12 bg-primary/50 rounded-xl px-4 border border-primary/20 shadow-sm"
            >
              <Search size={18} color={colors.primary} />
              <Text
                className="text-foreground font-medium flex-1 ml-3"
                numberOfLines={1}
              >
                {selectedProduct
                  ? selectedProduct.name
                  : t('warehouse.stockOpname.searchProductPlaceholder')}
              </Text>
              {selectedProduct ? (
                <TouchableOpacity onPress={() => resetForm()} className="p-1">
                  <X size={18} color={colors.primary} />
                </TouchableOpacity>
              ) : (
                <ChevronDown size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Selected Product Inputs - Appears when product is selected */}
      {status === 0 && selectedProduct && (
        <View className="bg-card border-b border-border p-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text
              className="font-bold text-primary flex-1 mr-2"
              numberOfLines={1}
            >
              {selectedProduct.name}
            </Text>
            <View className="flex-row gap-2">
              <Button
                label={isEdit ? t('element.update') : t('element.add')}
                onPress={isEdit ? updateItem : addItem}
                size="sm"
                className="h-10 min-w-[90px]"
              />
              <Button
                label={t('element.cancel')}
                variant="outline"
                onPress={() => {
                  resetForm();
                  setIsEdit(false);
                  setEditingId(null);
                }}
                size="sm"
                className="h-10 min-w-[90px]"
              />
            </View>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Input
                label={selectedProduct.Unit}
                keyboardType="numeric"
                selectTextOnFocus
                value={currentQty.qty1.toString()}
                onChangeText={v =>
                  setCurrentQty({ ...currentQty, qty1: Number(v) || 0 })
                }
                className="h-10 text-center"
              />
            </View>
            {selectedProduct.Unit2 && (
              <View className="flex-1">
                <Input
                  label={selectedProduct.Unit2}
                  keyboardType="numeric"
                  selectTextOnFocus
                  value={currentQty.qty2.toString()}
                  onChangeText={v =>
                    setCurrentQty({ ...currentQty, qty2: Number(v) || 0 })
                  }
                  className="h-10 text-center"
                />
              </View>
            )}
            {selectedProduct.Unit3 && (
              <View className="flex-1">
                <Input
                  label={selectedProduct.Unit3}
                  keyboardType="numeric"
                  selectTextOnFocus
                  value={currentQty.qty3.toString()}
                  onChangeText={v =>
                    setCurrentQty({ ...currentQty, qty3: Number(v) || 0 })
                  }
                  className="h-10 text-center"
                />
              </View>
            )}
            {selectedProduct.Unit4 && (
              <View className="flex-1">
                <Input
                  label={selectedProduct.Unit4}
                  keyboardType="numeric"
                  selectTextOnFocus
                  value={currentQty.qty4.toString()}
                  onChangeText={v =>
                    setCurrentQty({ ...currentQty, qty4: Number(v) || 0 })
                  }
                  className="h-10 text-center"
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Status Indicator (below header info) */}
      {status === 1 && (
        <View className="bg-green-500/10 border-b border-green-500/20 px-4 py-2 flex-row items-center">
          <CheckCircle size={14} color="#16a34a" className="mr-2" />
          <Text className="text-green-700 font-bold text-xs uppercase tracking-wider">
            {t('warehouse.stockOpname.approvedMode')}
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Filter for list */}
        {showSearch && (
          <View className="mb-4">
            <View className="bg-secondary/20 rounded-xl px-3 flex-row items-center h-10">
              <Search size={16} color={colors.mutedForeground} />
              <Input
                placeholder={t('warehouse.stockOpname.filterListedItems')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 bg-transparent border-0 h-10 px-2"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* Item List */}
        {filteredItems.map((item, index) => {
          const source = getProductSource(item.product_id);
          const diffValue = getDifference(item);
          const sysStockValue =
            item.sys_stock !== undefined
              ? Number(item.sys_stock)
              : getSystemStock(item.product_id);
          const totalPhys = calculateTotal(item);

          const prod = {
            id: item.product_id,
            name: item.product_name,
            Unit: item.unit1 || '',
            Unit2: item.unit2,
            Unit3: item.unit3,
            Unit4: item.unit4,
            Rat1: item.ratio1,
            Rat2: item.ratio2,
            Rat3: item.ratio3,
            Rat4: item.ratio4,
          };

          return (
            <View
              key={item.id}
              className="flex-row items-center mb-2 bg-card p-3 rounded-lg border border-border/50"
            >
              <Text className="text-muted-foreground mr-3 w-6 text-center font-bold">
                {index + 1}
              </Text>
              <View className="flex-1">
                <TouchableOpacity
                  onPress={() => {
                    const fullProd =
                      products.find(p => p.id === item.product_id) || prod;
                    setStockDetailProduct(fullProd as Product);
                    setShowStockDetail(true);
                  }}
                  className="active:opacity-60"
                >
                  <Text
                    className={`font-bold ${source === 'PKP' ? 'text-green-600' : 'text-blue-600'}`}
                  >
                    {item.product_name}
                  </Text>
                </TouchableOpacity>
                <View className="mt-1">
                  <Text className="text-[11px] text-muted-foreground">
                    <Text className="font-bold">
                      {t('warehouse.stockOpname.physical')}:
                    </Text>{' '}
                    {formatSplitStock(totalPhys, prod)}
                  </Text>
                  {showSystemStock && (
                    <>
                      <Text className="text-[11px] text-muted-foreground">
                        <Text className="font-bold">
                          {t('warehouse.stockOpname.system')}:
                        </Text>{' '}
                        {formatSplitStock(sysStockValue, prod)}
                      </Text>
                      <Text
                        className={`text-[11px] font-bold ${diffValue < 0 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {t('warehouse.stockOpname.difference')}:{' '}
                        {formatSplitStock(diffValue, prod)}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              {status === 0 && (
                <View className="flex-row gap-1">
                  <Pressable
                    onPress={() => startEdit(item)}
                    className="p-2 bg-blue-500/10 rounded-full"
                  >
                    <Edit2 size={16} color="#3b82f6" />
                  </Pressable>
                  <Pressable
                    onPress={() => deleteItem(item.id)}
                    className="p-2 bg-destructive/10 rounded-full"
                  >
                    <Trash2 size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: insets.bottom + 96 }} />
      </ScrollView>

      {/* Date & Notes Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 shadow-xl">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-bold text-foreground">
                {t('warehouse.stockOpname.opnameDetails')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDateModal(false)}
                className="p-2"
              >
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <View className="flex-row items-center mb-1.5 ml-1">
                <Calendar size={14} color={colors.primary} className="mr-2" />
                <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t('warehouse.stockOpname.transactionDate')}
                </Text>
              </View>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder={t('warehouse.stockOpname.transactionDate')}
              />
            </View>
            <View className="mb-6">
              <View className="flex-row items-center mb-1.5 ml-1">
                <FileText size={14} color={colors.primary} className="mr-2" />
                <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t('warehouse.stockOpname.notesRemarks')}
                </Text>
              </View>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder={t('warehouse.stockOpname.addNotesPlaceholder')}
                editable={status === 0}
                className="bg-secondary/10 border-0 h-12 px-4 rounded-xl text-sm"
                multiline
              />
            </View>

            <Button
              label={t('warehouse.stockOpname.saveDetails')}
              onPress={() => setShowDateModal(false)}
              className="w-full h-12 rounded-xl"
            />
          </View>
        </View>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl max-h-[80%]">
            <View className="p-4 border-b border-border flex-row items-center justify-between">
              <Text className="text-foreground font-bold text-lg">
                {t('warehouse.stockOpname.selectProduct')}
              </Text>
              <Pressable onPress={() => setShowProductModal(false)}>
                <X size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <View className="p-4">
              <Input
                placeholder={t(
                  'warehouse.stockOpname.searchProductPlaceholder',
                )}
                value={productSearch}
                onChangeText={setProductSearch}
              />
            </View>
            <ScrollView className="px-4">
              {productsLoading ? (
                <View className="py-20 items-center justify-center">
                  <Loading isLoading={true} />
                  <Text className="mt-4 text-muted-foreground">
                    {t('warehouse.stockOpname.searchingProducts')}
                  </Text>
                </View>
              ) : (
                <>
                  {products.length === 0 ? (
                    <View className="py-20 items-center justify-center">
                      <Search size={48} color={colors.border} />
                      <Text className="mt-4 text-muted-foreground">
                        {t('warehouse.stockOpname.noProductsFound')}
                      </Text>
                    </View>
                  ) : (
                    products.map(prod => (
                      <Pressable
                        key={prod.id}
                        className="p-4 border-b border-border active:bg-secondary/50"
                        onPress={() => {
                          setSelectedProduct(prod);
                          setProductSearch(prod.name);
                          setShowProductModal(false);
                        }}
                      >
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1 mr-4">
                            <Text
                              className="text-foreground font-bold"
                              numberOfLines={1}
                            >
                              {prod.name}
                            </Text>
                            <Text className="text-[10px] text-muted-foreground mt-1">
                              {formatSplitStock(Number(prod.stock || 0), prod)}
                            </Text>
                          </View>
                          <ChevronDown
                            size={16}
                            color={colors.mutedForeground}
                          />
                        </View>
                      </Pressable>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Stock Detail Modal */}
      <Modal
        visible={showStockDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStockDetail(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-card rounded-t-3xl overflow-hidden shadow-xl max-h-[85%]">
            <View className="p-4 border-b border-border flex-row justify-between items-center bg-secondary/10">
              <Text className="text-lg font-bold text-foreground">
                {t('warehouse.stockOpname.stockDetails')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowStockDetail(false)}
                className="p-2"
              >
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View className="p-4">
              <Text className="text-primary font-bold text-lg mb-4">
                {stockDetailProduct?.name}
              </Text>

              {/* Table Header */}
              <View className="flex-row border-b border-border pb-2 mb-2 bg-secondary/5 px-2">
                <Text className="flex-[2] font-bold text-muted-foreground text-xs">
                  {t('warehouse.stockOpname.warehouse')}
                </Text>
                <Text className="flex-[3] font-bold text-muted-foreground text-xs text-center">
                  {t('element.stock')}
                </Text>
                <Text className="flex-1 font-bold text-muted-foreground text-xs text-right">
                  {t('warehouse.stockOpname.source')}
                </Text>
              </View>

              <ScrollView className="max-h-[400px]">
                {warehouseLoading ? (
                  <Loading isLoading={true} />
                ) : !stockByWarehouse || stockByWarehouse.length === 0 ? (
                  <View className="py-10 items-center">
                    <Text className="text-muted-foreground mb-4">
                      {t('warehouse.stockOpname.noStockInfo')}
                    </Text>
                    <Button
                      label={t('warehouse.stockOpname.retry')}
                      onPress={() => refetchWarehouseData()}
                      size="sm"
                      variant="outline"
                    />
                  </View>
                ) : (
                  stockByWarehouse?.map((wh: any, idx: number) => {
                    const diff = Number(wh.Stock);
                    return (
                      <View
                        key={idx}
                        className="flex-row border-b border-border/50 py-3 px-2"
                      >
                        <Text className="flex-[2] text-xs text-foreground font-medium">
                          {wh.Descr}
                        </Text>
                        <Text className="flex-[3] text-[11px] text-center text-foreground">
                          {formatSplitStock(
                            diff,
                            stockDetailProduct as Product,
                          )}
                        </Text>
                        <Text
                          className={`flex-1 text-xs text-right font-bold ${wh.Source === 'PKP' ? 'text-yellow-600' : 'text-blue-600'}`}
                        >
                          {wh.Source}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>

            <View className="p-4 bg-secondary/5 px-6 pb-8">
              <Button
                label={t('warehouse.stockOpname.closeDetails')}
                onPress={() => setShowStockDetail(false)}
                className="w-full h-12 rounded-xl"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Buttons */}
      <View
        className="absolute right-6 flex-row gap-3"
        style={{ bottom: insets.bottom + 24 }}
      >
        {Boolean(_invoice && status === 0) && (
          <Pressable
            onPress={handleApprove}
            className="bg-green-600 p-4 rounded-full shadow-lg active:scale-95 items-center justify-center"
            style={{ elevation: 8 }}
          >
            <CheckCircle size={24} color="#ffffff" />
          </Pressable>
        )}

        {Boolean(_invoice && status === 1) && (
          <Pressable
            onPress={handleOpen}
            className="bg-yellow-600 p-4 rounded-full shadow-lg active:scale-95 items-center justify-center"
            style={{ elevation: 8 }}
          >
            <Unlock size={24} color="#ffffff" />
          </Pressable>
        )}

        {status === 0 && (
          <Pressable
            onPress={handleSave}
            className="bg-primary p-4 rounded-full shadow-lg active:scale-95 items-center justify-center"
            style={{ elevation: 8 }}
          >
            <Save size={24} color="#ffffff" />
          </Pressable>
        )}
      </View>

      {(invoiceLoading || stockLoading) && <Loading isLoading={true} />}
    </View>
  );
}
