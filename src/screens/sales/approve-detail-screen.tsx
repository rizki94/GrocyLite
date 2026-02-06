import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ToastAndroid,
  Modal,
  ActivityIndicator,
  LayoutAnimation,
  FlatList,
  TouchableOpacity,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../contexts/app-context';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import { useThemeColor } from '../../lib/colors';
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ArrowLeft,
  History,
  Info,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useConnection } from '../../hooks/use-connection';
import { ConnectionError } from '../../components/connection-error';

// New Imports for Gesture Experience
import {
  Gesture,
  GestureDetector,
  Pressable,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function ApproveDetailScreen({ navigation, route }: any) {
  const colors = useThemeColor();
  const { t } = useTranslation();
  const user = useContext(UserContext) as any;
  const { apiClient } = useConnection();

  const {
    _date,
    contactList = [],
    initialIndex = 0,
    contactName,
    _contact,
  } = route.params || {};

  const effectiveContactList = contactList.length
    ? contactList
    : [contactName || (Array.isArray(_contact) ? _contact[0] : _contact)];

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const targetContact = effectiveContactList[currentIndex];

  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);

  // History Modal State
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyProductName, setHistoryProductName] = useState('');

  // Reanimated Shared Values
  const translateX = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  const {
    data: detailData,
    isLoading,
    fetchError,
  } = useFetchWithParams(
    'api/bridge/approve_detail',
    {
      params: {
        company_name: targetContact,
        date: dateFormatted(new Date(_date || new Date())),
      },
    },
    { targetContact, _date },
    refreshing,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    if (isLoading) {
      setInvoices([]);
    }
  }, [isLoading, currentIndex]);

  useEffect(() => {
    const list = Array.isArray(detailData)
      ? detailData
      : Object.values(detailData || {});

    if (list.length > 0 && !isLoading) {
      const grouped: any = {};
      list.forEach((item: any) => {
        if (!grouped[item.NoTr]) {
          grouped[item.NoTr] = {
            ...item,
            invoice: item.NoTr,
            Total: 0,
            cogs: 0,
            discount: 0,
            items: [],
            expanded: true,
            approve: item.AccSpv === '1',
          };
        }
        grouped[item.NoTr].Total += Number(item.Amount || 0);
        grouped[item.NoTr].cogs += Number(item.cogs || 0);
        grouped[item.NoTr].discount += Number(item.Discount * item.CQty || 0);
        grouped[item.NoTr].items.push(item);
      });
      setInvoices(Object.values(grouped));
    } else if (!isLoading) {
      setInvoices([]);
    }
  }, [detailData, isLoading]);

  const toggleExpand = (invoiceNo: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInvoices(current =>
      current.map(inv =>
        inv.invoice === invoiceNo ? { ...inv, expanded: !inv.expanded } : inv,
      ),
    );
  };

  const handleApprove = async (invoiceNo: string, currentStatus: boolean) => {
    setInvoices(current =>
      current.map(inv =>
        inv.invoice === invoiceNo ? { ...inv, approve: !currentStatus } : inv,
      ),
    );

    try {
      await apiClient.post('api/bridge/approve_invoice', {
        invoice: invoiceNo,
        user: user?.name,
        approve: !currentStatus ? '1' : '0',
      });
    } catch (e: any) {
      ToastAndroid.show(
        t('approve.salesApprove.failedUpdateStatus'),
        ToastAndroid.SHORT,
      );
      setInvoices(current =>
        current.map(inv =>
          inv.invoice === invoiceNo ? { ...inv, approve: currentStatus } : inv,
        ),
      );
    }
  };

  const handleUpdateMemo = async (invoiceNo: string, memo: string) => {
    try {
      await apiClient.post('api/bridge/update_memo', {
        invoice: invoiceNo,
        memo: memo,
      });
      setInvoices(current =>
        current.map(inv =>
          inv.invoice === invoiceNo ? { ...inv, Memo: memo } : inv,
        ),
      );
    } catch (e) {
      ToastAndroid.show(
        t('approve.salesApprove.errorSavingMemo'),
        ToastAndroid.SHORT,
      );
    }
  };

  const handleApproveAll = async () => {
    const allApproved = invoices.every(i => i.approve);
    const newState = !allApproved;

    setInvoices(current => current.map(inv => ({ ...inv, approve: newState })));

    try {
      await apiClient.post('api/bridge/approve_invoice_all', {
        invoice: invoices.map(i => i.invoice),
        user: user?.name,
        approve: newState ? '1' : '0',
      });
      ToastAndroid.show(
        newState
          ? t('approve.salesApprove.approveAll')
          : t('approve.salesApprove.unapproveAll'),
        ToastAndroid.SHORT,
      );
    } catch (e) {
      ToastAndroid.show(
        t('approve.salesApprove.failedUpdateAll'),
        ToastAndroid.SHORT,
      );
    }
  };

  // Switch logic after animation
  const goToNext = () => {
    if (currentIndex < effectiveContactList.length - 1) {
      setCurrentIndex(curr => curr + 1);
    } else {
      ToastAndroid.show(
        t('approve.salesApprove.lastCustomer'),
        ToastAndroid.SHORT,
      );
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(curr => curr - 1);
    } else {
      ToastAndroid.show(
        t('approve.salesApprove.firstCustomer'),
        ToastAndroid.SHORT,
      );
    }
  };

  // Gesture Handling
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // Only start if swiping horizontally
    .onUpdate(event => {
      translateX.value = event.translationX;
      contentOpacity.value = interpolate(
        Math.abs(event.translationX),
        [0, SCREEN_WIDTH],
        [1, 0.4],
        Extrapolation.CLAMP,
      );
    })
    .onEnd(event => {
      if (
        event.translationX < -SWIPE_THRESHOLD &&
        currentIndex < effectiveContactList.length - 1
      ) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, () => {
          runOnJS(goToNext)();
          translateX.value = SCREEN_WIDTH;
          translateX.value = withSpring(0);
          contentOpacity.value = withTiming(1);
        });
      } else if (event.translationX > SWIPE_THRESHOLD && currentIndex > 0) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 }, () => {
          runOnJS(goToPrev)();
          translateX.value = -SCREEN_WIDTH;
          translateX.value = withSpring(0);
          contentOpacity.value = withTiming(1);
        });
      } else {
        translateX.value = withSpring(0);
        contentOpacity.value = withTiming(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: contentOpacity.value,
  }));

  const nextIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -20],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          translateX.value,
          [-SCREEN_WIDTH, -20],
          [0, 80],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const prevIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [20, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          translateX.value,
          [20, SCREEN_WIDTH],
          [-80, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const fetchHistory = async (
    pkey: string,
    accloc: string,
    customer: string,
    productName: string,
  ) => {
    setHistoryData([]);
    setHistoryProductName(productName);
    setHistoryLoading(true);
    setHistoryModalVisible(true);
    try {
      const response = await apiClient.get('api/bridge/history_product', {
        params: { pkey, accloc, customer },
      });
      setHistoryData(response.data);
    } catch (e) {
      ToastAndroid.show(
        t('approve.salesApprove.failedLoadHistory'),
        ToastAndroid.SHORT,
      );
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin < 0) return colors.red;
    if (margin < 5) return colors.orange;
    return colors.green;
  };

  const grandTotal = invoices.reduce(
    (acc: number, curr: any) => acc + (curr.Total || 0),
    0,
  );
  const grandProfit = invoices.reduce(
    (acc: number, curr: any) => acc + (curr.Total - (curr.cogs || 0) || 0),
    0,
  );
  const grandCogs = invoices.reduce(
    (acc: number, curr: any) => acc + (curr.cogs || 0),
    0,
  );
  const avgMargin = grandCogs > 0 ? (grandProfit / grandCogs) * 100 : 0;

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
      {/* Fixed Sticky Header */}
      <View
        className="flex-row items-center justify-between px-5 py-3 border-b border-border/40 bg-card"
        style={{ zIndex: 100 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full active:bg-secondary/20"
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View className="flex-1 px-2 items-center">
          <Text
            className="text-[14px] font-black text-foreground uppercase tracking-tight"
            numberOfLines={1}
          >
            {targetContact}
          </Text>
          <Text className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">
            {currentIndex + 1} / {effectiveContactList.length}{' '}
            {t('approve.salesApprove.customers')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          className="p-2 -mr-2 rounded-full active:bg-secondary/20"
        >
          <RotateCcw size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <View className="flex-1 overflow-hidden relative">
          {/* Side Indicators */}
          <Animated.View
            style={[
              prevIndicatorStyle,
              {
                position: 'absolute',
                left: 16,
                top: '40%',
                zIndex: 50,
                backgroundColor: colors.primary,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 5,
              },
            ]}
          >
            <ChevronLeft size={28} color="white" />
          </Animated.View>
          <Animated.View
            style={[
              nextIndicatorStyle,
              {
                position: 'absolute',
                right: 16,
                top: '40%',
                zIndex: 50,
                backgroundColor: colors.primary,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 5,
              },
            ]}
          >
            <ChevronRight size={28} color="white" />
          </Animated.View>

          <Animated.View
            style={[{ flex: 1, width: SCREEN_WIDTH }, animatedStyle]}
          >
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={colors.primary} size="large" />
                <Text className="mt-4 font-black text-primary uppercase text-[9px] tracking-widest">
                  {t('approve.salesApprove.loadingCustomerData')}
                </Text>
              </View>
            ) : (
              <>
                <View className="flex-row items-center justify-center py-1.5 bg-primary/10 border-b border-primary/20">
                  <Text className="text-[9px] text-primary uppercase tracking-widest font-black">
                    {t('approve.salesApprove.swipeNav')}
                  </Text>
                </View>

                <ScrollView
                  className="flex-1"
                  contentContainerStyle={{ padding: 16 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View className="flex-row gap-2 mb-4">
                    <View className="flex-1 p-3 rounded-2xl bg-secondary/10 border border-border/10 justify-center">
                      <Text className="text-[8px] uppercase font-black text-muted-foreground mb-0.5">
                        {t('approve.salesApprove.totalAmount')}
                      </Text>
                      <Text className="text-[14px] font-black text-foreground">
                        {numberWithComma(grandTotal)}
                      </Text>
                    </View>
                    <View className="flex-1 p-3 rounded-2xl bg-green-500/10 border border-green-500/20 justify-center">
                      <Text className="text-[8px] uppercase font-black text-green-600 mb-0.5">
                        {t('approve.salesApprove.totalProfit')}
                      </Text>
                      <Text className="text-[14px] font-black text-green-600">
                        {numberWithComma(grandProfit)}
                      </Text>
                    </View>
                    <View className="flex-1 p-2 rounded-xl border border-amber-500/30 bg-amber-500/5">
                      <Text
                        className="text-[8px] uppercase font-extrabold text-amber-600 mb-1"
                        numberOfLines={1}
                      >
                        {t('element.margin')}
                      </Text>
                      <Text className="text-sm font-bold text-amber-600">
                        {avgMargin.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleApproveAll}
                    activeOpacity={0.9}
                    className={cn(
                      'mb-6 rounded-2xl h-12 items-center justify-center shadow-lg active:scale-[0.98]',
                      invoices.every(i => i.approve)
                        ? 'bg-destructive'
                        : 'bg-primary',
                    )}
                  >
                    <Text className="text-[13px] font-black text-white uppercase tracking-widest">
                      {invoices.every(i => i.approve)
                        ? t('approve.salesApprove.unapproveEverything')
                        : t('approve.salesApprove.approveEverything')}
                    </Text>
                  </TouchableOpacity>

                  {fetchError && invoices.length === 0 ? (
                    <ConnectionError onRetry={onRefresh} message={fetchError} />
                  ) : (
                    <>
                      {invoices.map(inv => {
                        const profit = inv.Total - inv.cogs;
                        const margin =
                          inv.cogs > 0 ? (profit / inv.cogs) * 100 : 0;
                        const discountVal = inv.discount || 0;

                        return (
                          <Card
                            key={inv.invoice}
                            className="mb-6 bg-background border border-border/40 overflow-hidden shadow-sm"
                          >
                            {/* Invoice Header Card Part */}
                            <Pressable
                              className="flex-row items-center justify-between p-4 bg-secondary/5"
                              onPress={() => toggleExpand(inv.invoice)}
                            >
                              <View className="flex-row items-center justify-between p-4">
                                <View className="flex-col">
                                  <Text className="font-black text-primary text-[15px] tracking-tight">
                                    {inv.invoice}
                                  </Text>
                                  <Text className="text-[12px] font-bold text-foreground opacity-60 mt-0.5">
                                    {numberWithComma(inv.Total, 0)}
                                  </Text>
                                </View>
                                <View className="flex-row items-center">
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleApprove(inv.invoice, inv.approve)
                                    }
                                    className={cn(
                                      'mr-4 p-2 rounded-xl border-2',
                                      inv.approve
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-border/40 bg-background',
                                    )}
                                  >
                                    <Check
                                      size={20}
                                      color={
                                        inv.approve
                                          ? colors.green
                                          : colors.border
                                      }
                                      strokeWidth={3}
                                    />
                                  </TouchableOpacity>
                                  <View className="p-1 rounded-lg bg-secondary/10">
                                    {inv.expanded ? (
                                      <ChevronUp
                                        size={20}
                                        color={colors.foreground}
                                      />
                                    ) : (
                                      <ChevronDown
                                        size={20}
                                        color={colors.foreground}
                                      />
                                    )}
                                  </View>
                                </View>
                              </View>
                            </Pressable>

                            {inv.expanded && (
                              <View className="p-4 border-t border-border/10">
                                {/* Dense Metadata Strip */}
                                <View className="bg-background border border-border/10 rounded-xl p-3 mb-4">
                                  <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-1">
                                      <Text className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">
                                        {t('element.salesman')}
                                      </Text>
                                      <Text className="text-[11px] text-foreground font-black">
                                        {inv.Salesman}
                                      </Text>
                                    </View>
                                    <View className="flex-1 items-end">
                                      <Text className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">
                                        {t('element.top')}
                                      </Text>
                                      <Text className="text-[11px] text-foreground font-black">
                                        {inv.TermTOP} {t('element.days')}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Dense Financial Row */}
                                  <View className="flex-row mb-2">
                                    <View className="flex-1 border-r border-border/10 pr-2">
                                      <Text className="text-[8px] text-muted-foreground uppercase font-black mb-0.5">
                                        {t('element.profit')}
                                      </Text>
                                      <Text
                                        className="font-black text-[10px]"
                                        style={{
                                          color: getMarginColor(margin),
                                        }}
                                      >
                                        {numberWithComma(profit)} (
                                        {margin.toFixed(1)}
                                        %)
                                      </Text>
                                    </View>
                                    <View className="flex-1 border-r border-border/10 px-2">
                                      <Text className="text-[8px] text-muted-foreground uppercase font-black mb-0.5 text-center">
                                        {t(
                                          'approve.salesApprove.totalDiscount',
                                        )}
                                      </Text>
                                      <Text
                                        className="font-black text-[10px] text-center"
                                        style={
                                          Number(discountVal) > 0
                                            ? { color: colors.red }
                                            : { color: colors.green }
                                        }
                                      >
                                        {discountVal !== 0
                                          ? numberWithComma(discountVal)
                                          : '0'}
                                      </Text>
                                    </View>
                                    <View className="flex-1 pl-2">
                                      <Text className="text-[8px] text-muted-foreground uppercase font-black mb-0.5 text-right">
                                        {t('element.arLimit')}
                                      </Text>
                                      <Text
                                        className="font-black text-[10px] text-right"
                                        style={{
                                          color:
                                            Number(inv.AR) > Number(inv.Limit)
                                              ? colors.red
                                              : colors.green,
                                        }}
                                      >
                                        {numberWithComma(inv.AR)}
                                      </Text>
                                      <Text className="font-black text-[8px] text-foreground text-right">
                                        {numberWithComma(inv.Limit)}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Dense Memo */}

                                  <Input
                                    placeholder={t(
                                      'approve.salesApprove.enterMemo',
                                    )}
                                    defaultValue={inv.Memo || ''}
                                    onEndEditing={e =>
                                      handleUpdateMemo(
                                        inv.invoice,
                                        e.nativeEvent.text,
                                      )
                                    }
                                    className="bg-secondary/5 text-foreground text-[8px] rounded-xl min-h-[24px] h-[24px] font-bold border border-border/10"
                                  />
                                </View>

                                <Text className="text-[9px] font-black text-primary/50 uppercase tracking-[0.2em]">
                                  {t('approve.salesApprove.orderItems')}
                                </Text>
                                {/* Table Header Row */}
                                <View className="flex-row items-center py-2 border-b border-border/10 px-1 mt-2">
                                  <Text className="flex-[2.5] text-[8px] font-black text-muted-foreground uppercase">
                                    {t('element.product')}
                                  </Text>
                                  <Text className="flex-[0.5] text-[8px] font-black text-muted-foreground uppercase text-center">
                                    {t('element.qty')}
                                  </Text>
                                  <Text className="flex-[1] text-[8px] font-black text-muted-foreground uppercase text-right">
                                    {t('element.cogs')}
                                  </Text>
                                  <Text className="flex-[1.8] text-[8px] font-black text-muted-foreground uppercase text-right">
                                    {t('element.priceDiscMarg')}
                                  </Text>
                                  <Text className="flex-1 text-[8px] font-black text-muted-foreground uppercase text-right">
                                    {t('element.stock')}
                                  </Text>
                                </View>

                                {/* Table Data Rows */}
                                <View>
                                  {inv.items.map((item: any, idx: number) => {
                                    const s1 = parseInt(item.Stock1);
                                    const rop = parseInt(
                                      item.ReorderPoint || '0',
                                    );
                                    let stockColor = colors.green;
                                    if (s1 < 0) stockColor = colors.red;
                                    else if (s1 < rop)
                                      stockColor = colors.orange;

                                    return (
                                      <TouchableOpacity
                                        key={idx}
                                        activeOpacity={0.7}
                                        onPress={() =>
                                          fetchHistory(
                                            item.PKey,
                                            item.AccLoc,
                                            targetContact,
                                            item.Product_Name,
                                          )
                                        }
                                        className="flex-row items-center py-3 border-b border-border/5 px-1"
                                      >
                                        {/* Product Name Column */}
                                        <View className="flex-[2.5] pr-2">
                                          <Text
                                            className="font-black text-foreground text-[9px]"
                                            numberOfLines={2}
                                          >
                                            {item.Product_Name}
                                          </Text>
                                        </View>

                                        {/* Qty Column */}
                                        <View className="flex-[0.5] items-center">
                                          <Text className="font-black text-foreground text-[9px] text-center">
                                            {numberWithComma(item.CQty)}{' '}
                                            <Text className="text-[8px] text-center">
                                              {item.Unit}
                                            </Text>
                                          </Text>
                                        </View>
                                        <View className="flex-[1]  items-end">
                                          <Text className="text-right font-black text-foreground text-[8px]">
                                            {numberWithComma(item.cogs)}
                                          </Text>
                                        </View>

                                        {/* Price Column */}
                                        <View className="flex-[1.8] items-end">
                                          <Text className="text-right font-black text-foreground text-[10px]">
                                            {numberWithComma(item.Price)}
                                          </Text>
                                          <View className="flex-row items-center mt-0.5">
                                            {Number(item.Discount) !== 0 && (
                                              <Text
                                                className="text-[8px] font-black mr-1"
                                                style={
                                                  Number(item.Discount) > 0
                                                    ? { color: colors.red }
                                                    : { color: colors.green }
                                                }
                                              >
                                                {numberWithComma(item.Discount)}
                                              </Text>
                                            )}
                                            <Text
                                              className="text-[8px] font-black"
                                              style={{
                                                color: getMarginColor(
                                                  item.Margin,
                                                ),
                                              }}
                                            >
                                              ({Number(item.Margin).toFixed(1)}
                                              %)
                                            </Text>
                                          </View>
                                        </View>

                                        {/* Stock Column */}
                                        <View className="flex-1 items-end">
                                          <Text
                                            className="text-[10px] font-black font-mono tracking-tighter"
                                            style={{ color: stockColor }}
                                          >
                                            {item.Stock1}
                                          </Text>
                                          <Text
                                            className="text-[10px] font-black font-mono tracking-tighter"
                                            style={{ color: stockColor }}
                                          >
                                            {item.Stock2} | {item.Stock3}
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </View>
                            )}
                          </Card>
                        );
                      })}
                      <View className="h-10" />
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </Animated.View>
        </View>
      </GestureDetector>

      {/* History Modal */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/80">
          <View className="bg-card h-[80%] rounded-t-[40px] overflow-hidden">
            <View className="p-6 border-b border-border/30 flex-row justify-between items-center bg-secondary/5">
              <View className="flex-1">
                <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-[8px]">
                  {t('approve.salesApprove.transactionHistory')}
                </Text>
                <Text
                  className="text-sm text-foreground font-black uppercase tracking-tighter mt-1"
                  numberOfLines={1}
                >
                  {historyProductName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                className="p-2 bg-secondary/10 rounded-full"
              >
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={historyData}
              ListHeaderComponent={
                <View className="flex-row items-center py-2 border-b border-border/10 px-2 bg-secondary/5">
                  <Text className="flex-[1] text-[8px] font-black text-muted-foreground uppercase">
                    {t('element.date')}
                  </Text>
                  <Text className="flex-[0.7] text-[8px] font-black text-muted-foreground uppercase text-center">
                    {t('element.qty')}
                  </Text>
                  <Text className="flex-[1.2] text-[8px] font-black text-muted-foreground uppercase text-right">
                    {t('element.price')}
                  </Text>
                  <Text className="flex-[1] text-[8px] font-black text-muted-foreground uppercase text-right">
                    {t('element.discount')}
                  </Text>
                  <Text className="flex-[1.3] text-[8px] font-black text-muted-foreground uppercase text-right">
                    {t('element.total')}
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 20 }}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View className="flex-row items-center py-3 border-b border-border/5 px-2">
                  <Text className="flex-[1] text-[9px] font-black text-muted-foreground">
                    {dateFormatted(item.DateTr)}
                  </Text>
                  <View className="flex-[0.7] items-center">
                    <Text className="text-[9px] font-black text-foreground">
                      {numberWithComma(item.CQty)}
                    </Text>
                    <Text className="text-[7px] text-muted-foreground font-black uppercase">
                      {item.Unit}
                    </Text>
                  </View>
                  <Text className="flex-[1.2] text-[9px] font-black text-blue-600 text-right">
                    {numberWithComma(item.Price)}
                  </Text>
                  <Text
                    className="flex-[1] text-[9px] font-black text-right"
                    style={{
                      color: item.Discount > 0 ? colors.red : colors.green,
                    }}
                  >
                    {numberWithComma(item.Discount)}
                  </Text>
                  <Text className="flex-[1.3] text-[10px] font-black text-foreground text-right">
                    {numberWithComma(item.Amount)}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                historyLoading ? (
                  <View className="py-20 items-center">
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : (
                  <View className="py-20 items-center">
                    <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {t('approve.salesApprove.noHistory')}
                    </Text>
                  </View>
                )
              }
            />
            <View className="p-6 bg-card border-t border-border/10">
              <Button
                label={t('element.close')}
                onPress={() => setHistoryModalVisible(false)}
                className="h-12 rounded-2xl"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Transition Loader */}
      {isLoading && invoices.length > 0 && (
        <View className="absolute inset-0 bg-background/60 items-center justify-center z-[1000]">
          <View className="bg-card p-8 rounded-[30px] items-center border border-primary/20 shadow-2xl">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-4 font-black text-primary uppercase text-[9px]">
              {t('approve.salesApprove.loadingCustomerData')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
