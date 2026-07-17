import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  Share,
  Platform,
  ToastAndroid,
  TextInput,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Trash2,
  Share2,
  RefreshCw,
  Plus,
  Minus,
  Send,
  CloudLightning,
  AlertTriangle,
  FolderOpen,
  ChevronRight,
  User,
  Users,
  X,
  FileText,
  ChevronDown,
} from 'lucide-react-native';
import { useThemeColor } from '../../lib/colors';
import { DatePicker } from '../../components/ui/date-picker';
import { Input } from '../../components/ui/input';
import {
  useSalesOrderCache,
  Customer,
  Product,
  Salesman,
} from '../../hooks/use-sales-order-cache';
import {
  useSalesOrderDrafts,
  DraftItem,
  SalesOrderDraft,
} from '../../hooks/use-sales-order-drafts';
import { useDebounce } from '../../hooks/use-debounce';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { cn } from '../../lib/utils';

type Step = 1 | 2 | 3;
type ActiveTab = 'create' | 'drafts';

export function SalesOrderScreen() {
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();

  const cache = useSalesOrderCache();
  const draftsStore = useSalesOrderDrafts();

  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedSalesman, setSelectedSalesman] = useState<Salesman | null>(
    null,
  );
  const [orderDate, setOrderDate] = useState<Date>(new Date());

  // Step 2 — product inline search
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  const debouncedProductSearch = useDebounce(productSearch, 250);
  const [cart, setCart] = useState<DraftItem[]>([]);

  // Product detail form (shown below search once a product is selected)
  const [formProduct, setFormProduct] = useState<Product | null>(null);
  const [itemQty, setItemQty] = useState('1');
  const [itemUnit, setItemUnit] = useState<number>(1);
  const [itemDiscount, setItemDiscount] = useState('0');

  // Step 3
  const [memo, setMemo] = useState('');

  // Customer / Salesman modals (full-screen slide-up)
  const [custModal, setCustModal] = useState(false);
  const [salesmanModal, setSalesmanModal] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [salesmanSearch, setSalesmanSearch] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getPrice = useCallback(
    (product: Product, unitLevel: number) => {
      const level = (selectedCustomer?.price_type || 'D').toLowerCase();
      const key = `price_${level}${unitLevel}` as keyof Product;
      return (product[key] as number) || 0;
    },
    [selectedCustomer],
  );

  const getRatio = (product: Product, unitLevel: number) => {
    if (unitLevel === 1) return product.rat1;
    if (unitLevel === 2) return product.rat2;
    return product.rat3;
  };

  const getUnitName = (product: Product, unitLevel: number) => {
    if (unitLevel === 1) return product.unit1 || '';
    if (unitLevel === 2) return product.unit2 || '';
    return product.unit3 || '';
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return cache.customers;
    return cache.customers.filter(c =>
      c.name.toLowerCase().includes(custSearch.toLowerCase()),
    );
  }, [custSearch, cache.customers]);

  const filteredSalesmen = useMemo(() => {
    if (!salesmanSearch.trim()) return cache.salesmen;
    return cache.salesmen.filter(s =>
      s.Descr.toLowerCase().includes(salesmanSearch.toLowerCase()),
    );
  }, [salesmanSearch, cache.salesmen]);

  const filteredProducts = useMemo(() => {
    const q = debouncedProductSearch.trim().toLowerCase();
    if (!q) return cache.products;
    return cache.products.filter(
      p => p.name.toLowerCase().includes(q) || p.pkey.toLowerCase().includes(q),
    );
  }, [debouncedProductSearch, cache.products]);

  // ── Cart ───────────────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(() => {
    if (!formProduct) return;
    const qty = parseFloat(itemQty) || 0;
    if (qty <= 0) {
      Alert.alert('Invalid Qty', 'Please enter a valid quantity.');
      return;
    }
    const discount = parseFloat(itemDiscount) || 0;
    const price = getPrice(formProduct, itemUnit);
    const newItem: DraftItem = {
      pkey: formProduct.pkey,
      source: formProduct.source,
      name: formProduct.name,
      unit: itemUnit,
      unitName: getUnitName(formProduct, itemUnit),
      ratio: getRatio(formProduct, itemUnit),
      qty,
      price,
      discount,
      cos: formProduct.price_p1,
      weight:
        itemUnit === 1
          ? formProduct.weight1
          : itemUnit === 2
            ? formProduct.weight2
            : formProduct.weight3,
      volume:
        itemUnit === 1
          ? formProduct.volume1
          : itemUnit === 2
            ? formProduct.volume2
            : formProduct.volume3,
    };
    const existing = cart.findIndex(
      i => i.pkey === formProduct.pkey && i.unit === itemUnit,
    );
    setCart(prev => {
      const next = [...prev];
      if (existing > -1) next[existing] = newItem;
      else next.push(newItem);
      return next;
    });
    // Reset form
    setFormProduct(null);
    setProductSearch('');
    setShowProductResults(false);
    setItemQty('1');
    setItemDiscount('0');
    setItemUnit(1);
    Keyboard.dismiss();
  }, [formProduct, itemQty, itemUnit, itemDiscount, cart, getPrice]);

  const handleRemoveItem = (pkey: string, unit: number) => {
    setCart(prev => prev.filter(i => !(i.pkey === pkey && i.unit === unit)));
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    cart.forEach(item => {
      subtotal += item.price * item.qty;
      totalDiscount += item.discount * item.qty;
    });
    return { subtotal, totalDiscount, netTotal: subtotal - totalDiscount };
  }, [cart]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedCustomer(null);
    setSelectedSalesman(null);
    setCart([]);
    setMemo('');
    setFormProduct(null);
    setProductSearch('');
    setShowProductResults(false);
    setStep(1);
  };

  const handleSaveDraft = async () => {
    if (!selectedCustomer || !selectedSalesman || cart.length === 0) return;
    try {
      await draftsStore.saveDraft({
        date: dateFormatted(orderDate),
        customer: selectedCustomer,
        salesman: {
          id: selectedSalesman.IdSalesman,
          name: selectedSalesman.Descr,
        },
        memo,
        items: cart,
        total: totals.netTotal,
      });
      if (Platform.OS === 'android')
        ToastAndroid.show('Draft saved offline.', ToastAndroid.SHORT);
      handleReset();
      setActiveTab('drafts');
    } catch {
      Alert.alert('Error', 'Failed to save draft.');
    }
  };

  const handleSyncNow = async () => {
    if (!selectedCustomer || !selectedSalesman || cart.length === 0) return;
    try {
      const draft = await draftsStore.saveDraft({
        date: dateFormatted(orderDate),
        customer: selectedCustomer,
        salesman: {
          id: selectedSalesman.IdSalesman,
          name: selectedSalesman.Descr,
        },
        memo,
        items: cart,
        total: totals.netTotal,
      });
      await draftsStore.syncDraft(draft.id);
      Alert.alert('Success', 'Sales Order synced to ERP!');
      handleReset();
    } catch (e: any) {
      let msg = 'Saved offline. Will sync when connected.';
      if (
        e.message?.toLowerCase().includes('timeout') ||
        e.message?.toLowerCase().includes('network') ||
        !e.response
      ) {
        msg = 'Server cannot be reached. ' + msg;
      } else {
        msg =
          (e.response?.data?.message || e.message || 'Unknown error') +
          '. ' +
          msg;
      }
      Alert.alert('Sync Offline', msg);
      handleReset();
      setActiveTab('drafts');
    }
  };

  const handleShareHTML = async (draft: SalesOrderDraft) => {
    const rows = draft.items
      .map(
        (item, i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0">
          <div style="font-weight:600">${item.name}</div>
          <div style="font-size:11px;color:#888">${item.pkey}</div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center">${item.qty} ${item.unitName}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right"> ${numberWithComma(item.price)}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;color:#e74c3c"> ${numberWithComma(item.discount)}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600"> ${numberWithComma((item.price - item.discount) * item.qty)}</td>
      </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice</title></head>
<body style="font-family:sans-serif;padding:24px;color:#1a1a2e;max-width:700px;margin:auto">
  <div style="background:linear-gradient(135deg,#00a991,#007a6e);border-radius:12px;padding:24px;color:white;margin-bottom:24px">
    <div style="font-size:22px;font-weight:900">SALES ORDER</div>
    <div style="font-size:13px;opacity:0.8;margin-top:4px">Ref: ${draft.id.slice(0, 8).toUpperCase()}</div>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div style="background:#f8f8f8;border-radius:8px;padding:14px;flex:1">
      <div style="font-size:11px;text-transform:uppercase;color:#888;margin-bottom:4px">Customer</div>
      <div style="font-weight:700">${draft.customer.name}</div>
      <div style="font-size:12px;color:#666;margin-top:2px">Group ${draft.customer.price_type} · ${draft.customer.source}</div>
    </div>
    <div style="background:#f8f8f8;border-radius:8px;padding:14px;flex:1">
      <div style="font-size:11px;text-transform:uppercase;color:#888;margin-bottom:4px">Salesman</div>
      <div style="font-weight:700">${draft.salesman.name}</div>
      <div style="font-size:12px;color:#666;margin-top:2px">Date: ${draft.date}</div>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <thead><tr style="background:#f8f8f8">
      <th style="padding:10px 8px;text-align:left;font-size:12px">#</th>
      <th style="padding:10px 8px;text-align:left;font-size:12px">Item</th>
      <th style="padding:10px 8px;text-align:center;font-size:12px">Qty</th>
      <th style="padding:10px 8px;text-align:right;font-size:12px">Price</th>
      <th style="padding:10px 8px;text-align:right;font-size:12px">Disc</th>
      <th style="padding:10px 8px;text-align:right;font-size:12px">Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="background:#f8f8f8;border-radius:8px;padding:16px">
    <div style="display:flex;justify-content:space-between">
      <span style="color:#666">Net Total</span>
      <span style="font-weight:900;font-size:18px;color:#00a991"> ${numberWithComma(draft.total)}</span>
    </div>
  </div>
  ${draft.memo ? `<div style="margin-top:16px;background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;border-radius:4px"><strong>Note:</strong> ${draft.memo}</div>` : ''}
</body></html>`;

    try {
      const name = `SO_${draft.customer.name.replace(/[^a-z0-9]/gi, '_')}_${draft.id.slice(0, 6)}.html`;
      const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${name}`;
      await ReactNativeBlobUtil.fs.writeFile(path, html, 'utf8');
      await Share.share({
        title: 'Sales Order Invoice',
        url: (Platform.OS === 'ios' ? '' : 'file://') + path,
        message: `Sales Order – ${draft.customer.name}\nTotal:  ${numberWithComma(draft.total)}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to share invoice.');
    }
  };

  // ── Step indicator ─────────────────────────────────────────────────────────
  const STEPS = ['Customer', 'Items', 'Review'];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: colors.foreground,
              letterSpacing: -0.5,
            }}
          >
            Sales Order
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: colors.mutedForeground,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Offline · Sync Ready
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            cache
              .refreshCache()
              .then(() => {
                if (Platform.OS === 'android')
                  ToastAndroid.show('Cache updated', ToastAndroid.SHORT);
              })
              .catch(e => Alert.alert('Error', e.message))
          }
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw size={16} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {(['create', 'drafts'] as ActiveTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              setActiveTab(tab);
              if (tab === 'drafts') draftsStore.syncAllPending();
            }}
            activeOpacity={0.7}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  color:
                    activeTab === tab ? colors.primary : colors.mutedForeground,
                }}
              >
                {tab === 'create' ? 'New Order' : 'Drafts'}
              </Text>
              {tab === 'drafts' && draftsStore.drafts.length > 0 && (
                <View
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    width: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '900',
                      color: colors.primaryForeground,
                    }}
                  >
                    {draftsStore.drafts.length}
                  </Text>
                </View>
              )}
            </View>
            {activeTab === tab && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 16,
                  right: 16,
                  height: 2,
                  backgroundColor: colors.primary,
                  borderRadius: 2,
                }}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══════════════ CREATE ORDER TAB ═══════════════ */}
      {activeTab === 'create' && (
        <View style={{ flex: 1 }}>
          {/* Step indicator */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: colors.card,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            {STEPS.map((label, idx) => {
              const n = idx + 1;
              const done = step > n;
              const active = step === n;
              return (
                <React.Fragment key={label}>
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: done
                          ? colors.primary
                          : active
                            ? 'transparent'
                            : colors.secondary,
                        borderWidth: active ? 2 : 0,
                        borderColor: colors.primary,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '900',
                          color: done
                            ? colors.primaryForeground
                            : active
                              ? colors.primary
                              : colors.mutedForeground,
                        }}
                      >
                        {done ? '✓' : n}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '700',
                        marginTop: 2,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: active ? colors.primary : colors.mutedForeground,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                  {idx < STEPS.length - 1 && (
                    <View
                      style={{
                        flex: 1,
                        height: 2,
                        marginHorizontal: 8,
                        marginBottom: 16,
                        backgroundColor:
                          step > n ? colors.primary : colors.border,
                        borderRadius: 1,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* ── STEP 1: Customer + Salesman ── */}
          {step === 1 && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
            >
              {/* Date */}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  color: colors.mutedForeground,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginBottom: 8,
                }}
              >
                Transaction Date
              </Text>
              <View style={{ marginBottom: 20 }}>
                <DatePicker value={orderDate} onChange={setOrderDate} />
              </View>

              {/* Customer */}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  color: colors.mutedForeground,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginBottom: 8,
                }}
              >
                Customer
              </Text>
              {selectedCustomer ? (
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '900',
                          color: colors.foreground,
                          fontSize: 14,
                          flexShrink: 1,
                        }}
                      >
                        {selectedCustomer.name}
                      </Text>
                      <View
                        style={{
                          backgroundColor: colors.primary + '18',
                          borderRadius: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: '900',
                            color: colors.primary,
                            textTransform: 'uppercase',
                          }}
                        >
                          Group {selectedCustomer.price_type}
                        </Text>
                      </View>
                    </View>
                    {selectedCustomer.address && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.mutedForeground,
                          marginTop: 4,
                        }}
                        numberOfLines={2}
                      >
                        {selectedCustomer.address}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedCustomer(null)}
                    activeOpacity={0.7}
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      backgroundColor: colors.secondary,
                    }}
                  >
                    <X size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setCustModal(true)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.primary + '55',
                    borderStyle: 'dashed',
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: '700',
                        color: colors.foreground,
                        fontSize: 14,
                      }}
                    >
                      Select Customer
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.mutedForeground,
                        marginTop: 2,
                      }}
                    >
                      Price group auto-applied
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}

              {/* Salesman */}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  color: colors.mutedForeground,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginBottom: 8,
                }}
              >
                Salesman
              </Text>
              {selectedSalesman ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: colors.secondary + '40',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 24,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.foreground,
                      fontSize: 14,
                    }}
                  >
                    {selectedSalesman.Descr}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedSalesman(null)}
                    activeOpacity={0.7}
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      backgroundColor: colors.secondary,
                    }}
                  >
                    <X size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setSalesmanModal(true)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.primary + '55',
                    borderStyle: 'dashed',
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: '700',
                        color: colors.foreground,
                        fontSize: 14,
                      }}
                    >
                      Select Salesman
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.mutedForeground,
                        marginTop: 2,
                      }}
                    >
                      Required for the transaction
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setStep(2)}
                disabled={!selectedCustomer || !selectedSalesman}
                activeOpacity={0.8}
                style={{
                  height: 56,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor:
                    !selectedCustomer || !selectedSalesman
                      ? colors.secondary
                      : colors.primary,
                }}
              >
                <Text
                  style={{
                    fontWeight: '900',
                    fontSize: 14,
                    color:
                      !selectedCustomer || !selectedSalesman
                        ? colors.mutedForeground
                        : colors.primaryForeground,
                  }}
                >
                  NEXT: ADD ITEMS
                </Text>
                <ChevronRight
                  size={18}
                  color={
                    !selectedCustomer || !selectedSalesman
                      ? colors.mutedForeground
                      : colors.primaryForeground
                  }
                />
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── STEP 2: Cart with inline product search ── */}
          {step === 2 && (
            <View style={{ flex: 1 }}>
              {/* Product search zone */}
              <View
                style={{
                  backgroundColor: colors.card,
                  borderBottomWidth: 2,
                  borderBottomColor: colors.primary + '1A',
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '900',
                      color: colors.primary + 'AA',
                      textTransform: 'uppercase',
                      letterSpacing: 2,
                      marginBottom: 8,
                    }}
                  >
                    {formProduct ? formProduct.name : 'Select Product'}
                  </Text>

                  {/* Inline search input (same pattern as stock-opname) */}
                  <Input
                    placeholder="Search product by name or code..."
                    value={productSearch}
                    onChangeText={v => {
                      setProductSearch(v);
                      setShowProductResults(v.length > 0);
                      if (v.length === 0) {
                        setFormProduct(null);
                      }
                    }}
                    onFocus={() =>
                      productSearch.length > 0 && setShowProductResults(true)
                    }
                    leftIcon={
                      <Search
                        size={17}
                        color={
                          formProduct ? colors.primary : colors.mutedForeground
                        }
                      />
                    }
                    rightIcon={
                      productSearch ? (
                        <TouchableOpacity
                          onPress={() => {
                            setProductSearch('');
                            setFormProduct(null);
                            setShowProductResults(false);
                          }}
                          style={{ padding: 4 }}
                          activeOpacity={0.7}
                        >
                          <X size={15} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      ) : null
                    }
                  />
                </View>

                {/* Inline dropdown results */}
                {showProductResults && (
                  <View
                    style={{
                      marginHorizontal: 16,
                      marginBottom: 8,
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      maxHeight: 200,
                    }}
                  >
                    <FlatList
                      data={filteredProducts}
                      keyExtractor={item => `${item.pkey}_${item.source}`}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      ListEmptyComponent={
                        <View
                          style={{
                            paddingVertical: 24,
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Search size={26} color={colors.mutedForeground} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: colors.mutedForeground,
                            }}
                          >
                            No products found
                          </Text>
                        </View>
                      }
                      renderItem={({ item: prod, index }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setFormProduct(prod);
                            setProductSearch(prod.name);
                            setShowProductResults(false);
                            setItemUnit(1);
                            setItemQty('1');
                            setItemDiscount('0');
                            Keyboard.dismiss();
                          }}
                          activeOpacity={0.6}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            borderTopWidth: index === 0 ? 0 : 1,
                            borderTopColor: colors.border,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontWeight: '700',
                                color: colors.foreground,
                                fontSize: 13,
                              }}
                            >
                              {prod.name}
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 3,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  color: colors.mutedForeground,
                                }}
                              >
                                {prod.pkey}
                              </Text>
                              <View
                                style={{
                                  paddingHorizontal: 5,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                  backgroundColor:
                                    prod.source === 'PKP'
                                      ? colors.amber + '18'
                                      : colors.blue + '18',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 8,
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    color:
                                      prod.source === 'PKP'
                                        ? colors.amber
                                        : colors.blue,
                                  }}
                                >
                                  {prod.source}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '900',
                                color: colors.primary,
                              }}
                            >
                              {numberWithComma(getPrice(prod, 1))}
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                color: colors.mutedForeground,
                              }}
                            >
                              {prod.unit1}
                            </Text>
                          </View>
                          <ChevronDown
                            size={13}
                            color={colors.mutedForeground}
                            style={{
                              transform: [{ rotate: '-90deg' }],
                              opacity: 0.4,
                            }}
                          />
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}

                {/* Product form — unit / qty / discount */}
                {formProduct && !showProductResults && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                    {/* Unit selector */}
                    <View
                      style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}
                    >
                      {[1, 2, 3].map(n => {
                        const name = getUnitName(formProduct, n);
                        if (!name && n > 1) return null;
                        return (
                          <TouchableOpacity
                            key={n}
                            onPress={() => setItemUnit(n)}
                            activeOpacity={0.7}
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              padding: 10,
                              alignItems: 'center',
                              borderWidth: 1.5,
                              borderColor:
                                itemUnit === n ? colors.primary : colors.border,
                              backgroundColor:
                                itemUnit === n
                                  ? colors.primary + '15'
                                  : colors.card,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                color:
                                  itemUnit === n
                                    ? colors.primary
                                    : colors.foreground,
                              }}
                            >
                              {name || `Unit ${n}`}
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                color: colors.mutedForeground,
                                marginTop: 2,
                              }}
                            >
                              {numberWithComma(getPrice(formProduct, n))}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Qty + Discount row */}
                    <View className="flex flex-row gap-2 items-end mb-2">
                      {/* Qty stepper */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          flex: 1,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            setItemQty(p =>
                              String(Math.max(1, (parseFloat(p) || 1) - 1)),
                            )
                          }
                          activeOpacity={0.7}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: colors.secondary,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Minus size={16} color={colors.foreground} />
                        </TouchableOpacity>
                        <TextInput
                          value={itemQty}
                          onChangeText={setItemQty}
                          keyboardType="numeric"
                          style={{
                            flex: 1,
                            height: 36,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.card,
                            textAlign: 'center',
                            fontWeight: '900',
                            color: colors.foreground,
                            fontSize: 12,
                          }}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            setItemQty(p => String((parseFloat(p) || 0) + 1))
                          }
                          activeOpacity={0.7}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: colors.secondary,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Plus size={16} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>

                      {/* Discount field */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 9,
                            color: colors.mutedForeground,
                            fontWeight: '700',
                            marginBottom: 3,
                            textTransform: 'uppercase',
                          }}
                        >
                          Disc/item ()
                        </Text>
                        <TextInput
                          value={itemDiscount}
                          onChangeText={setItemDiscount}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.mutedForeground}
                          style={{
                            height: 36,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.card,
                            paddingHorizontal: 10,
                            color: colors.foreground,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={handleAddToCart}
                      activeOpacity={0.8}
                      style={{
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 8,
                      }}
                    >
                      <Plus size={16} color={colors.primaryForeground} />
                      <Text
                        style={{
                          fontWeight: '900',
                          fontSize: 13,
                          color: colors.primaryForeground,
                        }}
                      >
                        ADD TO CART
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Cart list */}
              <FlatList
                data={cart}
                keyExtractor={item => `${item.pkey}_${item.unit}`}
                contentContainerStyle={{ padding: 16 }}
                style={{ flex: 1 }}
                ListEmptyComponent={
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 60,
                    }}
                  >
                    <ShoppingCart size={44} color={colors.mutedForeground} />
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontWeight: '900',
                        marginTop: 12,
                        fontSize: 15,
                      }}
                    >
                      Cart is empty
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      Search a product above to start
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const lineTotal = (item.price - item.discount) * item.qty;
                  return (
                    <View
                      style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 14,
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text
                            style={{
                              fontWeight: '900',
                              color: colors.foreground,
                              fontSize: 13,
                              lineHeight: 18,
                            }}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              color: colors.mutedForeground,
                              marginTop: 2,
                            }}
                          >
                            {item.pkey}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(item.pkey, item.unit)}
                          activeOpacity={0.7}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 10,
                            backgroundColor: colors.red + '18',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={14} color={colors.red} />
                        </TouchableOpacity>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 10,
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: colors.secondary,
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '900',
                              color: colors.foreground,
                            }}
                          >
                            {item.qty} {item.unitName}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                            flex: 1,
                          }}
                        >
                          @ {numberWithComma(item.price)}
                        </Text>
                        {item.discount > 0 && (
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: colors.red,
                            }}
                          >
                            - {numberWithComma(item.discount)}
                          </Text>
                        )}
                        <Text
                          style={{
                            fontWeight: '900',
                            color: colors.foreground,
                            fontSize: 14,
                          }}
                        >
                          {numberWithComma(lineTotal)}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />

              {/* Footer nav */}
              <View
                style={{
                  backgroundColor: colors.card,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: Math.max(insets.bottom, 16),
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: colors.mutedForeground,
                      textTransform: 'uppercase',
                    }}
                  >
                    Total
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '900',
                      color: colors.primary,
                    }}
                  >
                    {numberWithComma(totals.netTotal)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '900',
                        color: colors.foreground,
                        fontSize: 13,
                      }}
                    >
                      Back
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStep(3)}
                    disabled={cart.length === 0}
                    activeOpacity={0.8}
                    style={{
                      flex: 2,
                      height: 48,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        cart.length === 0 ? colors.secondary : colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '900',
                        fontSize: 13,
                        color:
                          cart.length === 0
                            ? colors.mutedForeground
                            : colors.primaryForeground,
                      }}
                    >
                      Review Order
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ── STEP 3: Review & Submit ── */}
          {step === 3 && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            >
              {/* Summary */}
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    backgroundColor: colors.primary + '18',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '900',
                      color: colors.primary,
                      textTransform: 'uppercase',
                      letterSpacing: 2,
                    }}
                  >
                    Order Summary
                  </Text>
                </View>
                <View style={{ padding: 16, gap: 10 }}>
                  {[
                    ['Customer', selectedCustomer?.name ?? ''],
                    ['Salesman', selectedSalesman?.Descr ?? ''],
                    ['Date', dateFormatted(orderDate)],
                    ['Items', `${cart.length} line(s)`],
                  ].map(([lbl, val]) => (
                    <View
                      key={lbl}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        {lbl}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: colors.foreground,
                        }}
                      >
                        {val}
                      </Text>
                    </View>
                  ))}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, color: colors.mutedForeground }}
                    >
                      Price Group
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.primary + '18',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '900',
                          color: colors.primary,
                          textTransform: 'uppercase',
                        }}
                      >
                        {selectedCustomer?.price_type}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Memo */}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '900',
                  color: colors.mutedForeground,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginBottom: 8,
                }}
              >
                Memo / Notes
              </Text>
              <TextInput
                placeholder="Optional notes..."
                placeholderTextColor={colors.mutedForeground}
                value={memo}
                onChangeText={setMemo}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  color: colors.foreground,
                  fontSize: 14,
                  textAlignVertical: 'top',
                  minHeight: 80,
                  marginBottom: 16,
                }}
              />

              {/* Totals */}
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    Subtotal
                  </Text>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.foreground,
                      fontSize: 13,
                    }}
                  >
                    {numberWithComma(totals.subtotal)}
                  </Text>
                </View>
                {totals.totalDiscount > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: colors.red, fontSize: 13 }}>
                      Discount
                    </Text>
                    <Text
                      style={{
                        fontWeight: '700',
                        color: colors.red,
                        fontSize: 13,
                      }}
                    >
                      −Rp {numberWithComma(totals.totalDiscount)}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginVertical: 8,
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '900',
                      color: colors.foreground,
                      fontSize: 13,
                    }}
                  >
                    NET TOTAL
                  </Text>
                  <Text
                    style={{
                      fontWeight: '900',
                      color: colors.primary,
                      fontSize: 16,
                    }}
                  >
                    {numberWithComma(totals.netTotal)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSyncNow}
                activeOpacity={0.8}
                style={{
                  height: 56,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: colors.primary,
                  marginBottom: 10,
                }}
              >
                <CloudLightning size={18} color={colors.primaryForeground} />
                <Text
                  style={{
                    fontWeight: '900',
                    color: colors.primaryForeground,
                    fontSize: 14,
                  }}
                >
                  SYNC TO SERVER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveDraft}
                activeOpacity={0.8}
                style={{
                  height: 48,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: colors.secondary,
                  marginBottom: 10,
                }}
              >
                <FileText size={15} color={colors.foreground} />
                <Text
                  style={{
                    fontWeight: '900',
                    color: colors.foreground,
                    fontSize: 13,
                  }}
                >
                  Save Offline Draft
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStep(2)}
                activeOpacity={0.7}
                style={{
                  height: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontWeight: '700',
                    color: colors.mutedForeground,
                    fontSize: 13,
                  }}
                >
                  ← Back to Cart
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ─── Customer Modal ─── */}
          <Modal visible={custModal} animationType="slide">
            <View
              style={{
                flex: 1,
                backgroundColor: colors.background,
                paddingTop: insets.top,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setCustModal(false);
                    setCustSearch('');
                  }}
                  activeOpacity={0.7}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowLeft size={18} color={colors.foreground} />
                </TouchableOpacity>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    height: 40,
                    gap: 8,
                  }}
                >
                  <Search size={15} color={colors.mutedForeground} />
                  <TextInput
                    value={custSearch}
                    onChangeText={setCustSearch}
                    placeholder="Search customer..."
                    placeholderTextColor={colors.mutedForeground}
                    style={{ flex: 1, color: colors.foreground, fontSize: 14 }}
                    autoFocus
                  />
                  {custSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setCustSearch('')}
                      activeOpacity={0.7}
                    >
                      <X size={13} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <FlatList
                data={filteredCustomers}
                keyExtractor={(item: Customer) => `${item.id}_${item.name}`}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }: { item: Customer }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCustomer(item);
                      setCustModal(false);
                      setCustSearch('');
                    }}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 14,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: '700',
                            color: colors.foreground,
                            fontSize: 14,
                            flexShrink: 1,
                          }}
                        >
                          {item.name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: colors.primary + '18',
                            borderRadius: 4,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 8,
                              fontWeight: '900',
                              color: colors.primary,
                              textTransform: 'uppercase',
                            }}
                          >
                            Group {item.price_type}
                          </Text>
                        </View>
                      </View>
                      {item.address && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.mutedForeground,
                            marginTop: 3,
                          }}
                          numberOfLines={1}
                        >
                          {item.address}
                        </Text>
                      )}
                    </View>
                    <ChevronRight
                      size={14}
                      color={colors.mutedForeground}
                      style={{ opacity: 0.5 }}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          </Modal>

          {/* ─── Salesman Modal ─── */}
          <Modal visible={salesmanModal} animationType="slide">
            <View
              style={{
                flex: 1,
                backgroundColor: colors.background,
                paddingTop: insets.top,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setSalesmanModal(false);
                    setSalesmanSearch('');
                  }}
                  activeOpacity={0.7}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowLeft size={18} color={colors.foreground} />
                </TouchableOpacity>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    height: 40,
                    gap: 8,
                  }}
                >
                  <Search size={15} color={colors.mutedForeground} />
                  <TextInput
                    value={salesmanSearch}
                    onChangeText={setSalesmanSearch}
                    placeholder="Search salesman..."
                    placeholderTextColor={colors.mutedForeground}
                    style={{ flex: 1, color: colors.foreground, fontSize: 14 }}
                    autoFocus
                  />
                  {salesmanSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSalesmanSearch('')}
                      activeOpacity={0.7}
                    >
                      <X size={13} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <FlatList
                data={filteredSalesmen}
                keyExtractor={(item: Salesman) => String(item.IdSalesman)}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }: { item: Salesman }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedSalesman(item);
                      setSalesmanModal(false);
                      setSalesmanSearch('');
                    }}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 12,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        color: colors.foreground,
                        fontSize: 14,
                      }}
                    >
                      {item.Descr}
                    </Text>
                    <ChevronRight
                      size={14}
                      color={colors.mutedForeground}
                      style={{ opacity: 0.5 }}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          </Modal>
        </View>
      )}

      {/* ═══════════════ DRAFTS TAB ═══════════════ */}
      {activeTab === 'drafts' && (
        <FlatList
          data={draftsStore.drafts}
          keyExtractor={(item: SalesOrderDraft) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          ListEmptyComponent={
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 80,
              }}
            >
              <FolderOpen size={44} color={colors.mutedForeground} />
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontWeight: '900',
                  marginTop: 12,
                  fontSize: 15,
                }}
              >
                No pending drafts
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                All orders have been synced
              </Text>
            </View>
          }
          renderItem={({ item }: { item: SalesOrderDraft }) => {
            const statusMap: Record<
              string,
              { label: string; bg: string; txt: string }
            > = {
              PENDING: {
                label: 'Pending',
                bg: colors.amber + '18',
                txt: colors.amber,
              },
              SYNCING: {
                label: 'Syncing...',
                bg: colors.blue + '18',
                txt: colors.blue,
              },
              FAILED: {
                label: 'Failed',
                bg: colors.red + '18',
                txt: colors.red,
              },
              SYNCED: {
                label: 'Synced',
                bg: colors.green + '18',
                txt: colors.green,
              },
            };
            const s = statusMap[item.status] ?? statusMap.PENDING;
            return (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                  marginBottom: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingTop: 14,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: '900',
                        color: colors.foreground,
                        fontSize: 14,
                      }}
                    >
                      {item.customer.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.mutedForeground,
                        marginTop: 2,
                      }}
                    >
                      {item.date} · {item.salesman.name}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: s.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        color: s.txt,
                      }}
                    >
                      {s.label}
                    </Text>
                  </View>
                </View>

                {item.status === 'FAILED' && item.error && (
                  <View
                    style={{
                      marginHorizontal: 14,
                      marginTop: 10,
                      backgroundColor: colors.red + '08',
                      borderWidth: 1,
                      borderColor: colors.red + '22',
                      borderRadius: 10,
                      padding: 10,
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={14} color={colors.red} />
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.red,
                        flex: 1,
                        lineHeight: 16,
                      }}
                    >
                      {item.error}
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginTop: 2,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.mutedForeground,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                      }}
                    >
                      Net Total
                    </Text>
                    <Text
                      style={{
                        fontWeight: '900',
                        color: colors.foreground,
                        fontSize: 16,
                        marginTop: 2,
                      }}
                    >
                      {numberWithComma(item.total)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleShareHTML(item)}
                      activeOpacity={0.7}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: colors.secondary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Share2 size={15} color={colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        draftsStore
                          .syncDraft(item.id)
                          .then(() => Alert.alert('', 'Order synced!'))
                          .catch(e => Alert.alert('Error', e.message))
                      }
                      activeOpacity={0.7}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: colors.primary + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Send size={15} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert('Delete Draft', 'Remove this draft?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => draftsStore.deleteDraft(item.id),
                          },
                        ])
                      }
                      activeOpacity={0.7}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: colors.red + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={15} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
