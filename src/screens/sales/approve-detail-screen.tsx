import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ToastAndroid,
  Modal,
  ActivityIndicator,
  LayoutAnimation,
  FlatList,
  TouchableOpacity,
  Platform,
  UIManager,
} from 'react-native';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { useConnection } from '../../hooks/use-connection';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../contexts/app-context';
import { dateFormatted, numberWithComma, cls } from '../../utils/helpers';
import { useThemeColor } from '../../lib/colors';
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ArrowLeft,
  MessageSquare,
  History,
  Info,
  RotateCcw,
} from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useSwipe } from '../../hooks/use-swipe';
import { Card } from '../../components/ui/card';
import { SafeAreaView } from 'react-native-safe-area-context';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function ApproveDetailScreen({ navigation, route }: any) {
  const colors = useThemeColor();
  const { t } = useTranslation();
  const user = useContext(UserContext);
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
  const [memoModalVisible, setMemoModalVisible] = useState(false);
  const [currentMemo, setCurrentMemo] = useState({ invoice: '', memo: '' });

  // History Modal State
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

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
            expanded: true, // Auto-expand for better visibility
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

  const saveMemo = async () => {
    try {
      const response = await apiClient.post('api/bridge/update_memo', {
        invoice: currentMemo.invoice,
        memo: currentMemo.memo,
      });
      if (response.data.status === 200) {
        ToastAndroid.show(
          t('approve.salesApprove.memoUpdated'),
          ToastAndroid.SHORT,
        );
        setMemoModalVisible(false);
        onRefresh();
      }
    } catch (e) {
      ToastAndroid.show(
        t('approve.salesApprove.errorSavingMemo'),
        ToastAndroid.SHORT,
      );
    }
  };

  const fetchHistory = async (pkey: string, accloc: string) => {
    setHistoryLoading(true);
    setHistoryModalVisible(true);
    try {
      const response = await apiClient.get('api/bridge/history_product', {
        params: { pkey, accloc },
      });
      const data = response.data;
      setHistoryData(data);
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

  const onSwipeLeft = () => {
    if (currentIndex < effectiveContactList.length - 1) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentIndex(curr => curr + 1);
    } else {
      ToastAndroid.show(
        t('approve.salesApprove.lastCustomer'),
        ToastAndroid.SHORT,
      );
    }
  };

  const onSwipeRight = () => {
    if (currentIndex > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentIndex(curr => curr - 1);
    } else {
      ToastAndroid.show(
        t('approve.salesApprove.firstCustomer'),
        ToastAndroid.SHORT,
      );
    }
  };

  const { onTouchStart, onTouchEnd } = useSwipe(onSwipeLeft, onSwipeRight, 6);

  const grandTotal = invoices.reduce(
    (acc: number, curr: any) => acc + (curr.Total || 0),
    0,
  );
  const grandProfit = invoices.reduce(
    (acc: number, curr: any) => acc + (curr.Total - (curr.cogs || 0) || 0),
    0,
  );

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-card">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 -ml-2 rounded-full active:bg-secondary/20"
          >
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View className="ml-2 flex-1">
            <Text
              className="text-lg font-bold text-foreground"
              numberOfLines={1}
            >
              {targetContact || t('approve.salesApprove.approve')}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {currentIndex + 1} of {effectiveContactList.length}{' '}
              {t('approve.salesApprove.customers')}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          className="p-2 rounded-full active:bg-secondary/20"
        >
          <RotateCcw size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        {/* Navigation Info */}
        <View className="flex-row items-center justify-center p-2 bg-secondary/10">
          <Info size={12} color={colors.mutedForeground} className="mr-1" />
          <Text className="text-[10px] text-muted-foreground">
            {t('approve.salesApprove.swipeNav')}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Summary Header */}
          <View className="flex-row gap-3 mb-6">
            <Card className="flex-1 p-3 bg-primary/5 border-primary/20">
              <Text className="text-[10px] uppercase font-bold text-primary mb-1">
                {t('approve.salesApprove.totalAmount')}
              </Text>
              <Text className="text-lg font-bold text-primary">
                {numberWithComma(grandTotal)}
              </Text>
            </Card>
            <Card className="flex-1 p-3 bg-green-500/5 border-green-500/20">
              <Text className="text-[10px] uppercase font-bold text-green-600 mb-1">
                {t('approve.salesApprove.totalProfit')}
              </Text>
              <Text className="text-lg font-bold text-green-600">
                {numberWithComma(grandProfit)}
              </Text>
            </Card>
          </View>

          <Button
            label={
              invoices.every(i => i.approve)
                ? t('approve.salesApprove.unapproveEverything')
                : t('approve.salesApprove.approveEverything')
            }
            variant={invoices.every(i => i.approve) ? 'destructive' : 'default'}
            onPress={handleApproveAll}
            className="mb-6 rounded-xl h-12"
          />

          {isLoading ? (
            <View className="py-20 items-center">
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-4 text-muted-foreground">
                {t('approve.salesApprove.loadingDetails')}
              </Text>
            </View>
          ) : (
            invoices.map(inv => {
              const profit = inv.Total - inv.cogs;
              const margin = inv.cogs > 0 ? (profit / inv.cogs) * 100 : 0;

              return (
                <Card
                  key={inv.invoice}
                  className="mb-6 overflow-hidden border border-border bg-card"
                >
                  <Pressable
                    className="p-4 bg-secondary/5 flex-row items-center justify-between"
                    onPress={() => toggleExpand(inv.invoice)}
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="font-bold text-primary text-base mr-2">
                          {inv.invoice}
                        </Text>
                        {inv.approve && (
                          <View className="bg-green-100 px-2 py-0.5 rounded">
                            <Text className="text-[10px] text-green-700 font-bold uppercase">
                              {t('approve.salesApprove.approved')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-sm font-bold text-foreground mt-1">
                        {t('element.total')}: {numberWithComma(inv.Total)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => handleApprove(inv.invoice, inv.approve)}
                        className="mr-3 p-2 bg-card rounded-full border border-border"
                      >
                        {inv.approve ? (
                          <X size={20} color={colors.destructive} />
                        ) : (
                          <Check size={20} color={colors.green} />
                        )}
                      </Pressable>
                      {inv.expanded ? (
                        <ChevronUp size={20} color={colors.mutedForeground} />
                      ) : (
                        <ChevronDown size={20} color={colors.mutedForeground} />
                      )}
                    </View>
                  </Pressable>

                  {inv.expanded && (
                    <View className="p-4">
                      {/* Secondary Info Rows */}
                      <View className="flex-row flex-wrap gap-4 mb-4 pb-4 border-b border-border/50">
                        <View>
                          <Text className="text-[10px] text-muted-foreground uppercase font-bold">
                            {t('element.salesman')}
                          </Text>
                          <Text className="text-sm text-foreground font-medium">
                            {inv.Salesman}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-[10px] text-muted-foreground uppercase font-bold">
                            {t('element.priceGroup')}
                          </Text>
                          <Text className="text-sm text-foreground font-medium">
                            {inv.PriceType}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-[10px] text-muted-foreground uppercase font-bold">
                            {t('element.top')}
                          </Text>
                          <Text className="text-sm text-foreground font-medium">
                            {inv.TermTOP} Days
                          </Text>
                        </View>
                      </View>

                      {/* Detail Stats Grid */}
                      <View className="flex-row flex-wrap mb-6">
                        <View className="w-1/2 mb-3">
                          <Text className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                            {t('element.profit')}/{t('element.margin')}
                          </Text>
                          <Text
                            className="font-bold"
                            style={{
                              color:
                                profit > 0 ? colors.green : colors.destructive,
                            }}
                          >
                            {numberWithComma(profit)} ({margin.toFixed(1)}%)
                          </Text>
                        </View>
                        <View className="w-1/2 mb-3">
                          <Text className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                            {t('approve.salesApprove.totalDiscount')}
                          </Text>
                          <Text
                            className="font-bold"
                            style={{
                              color:
                                inv.discount > 0
                                  ? colors.destructive
                                  : colors.green,
                            }}
                          >
                            {numberWithComma(inv.discount)}
                          </Text>
                        </View>
                        <View className="w-1/2 mb-3">
                          <Text className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                            {t('element.limit')}
                          </Text>
                          <Text className="font-bold text-foreground">
                            {numberWithComma(inv.Limit)}
                          </Text>
                        </View>
                        <View className="w-1/2 mb-3">
                          <Text className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                            {t('element.ar')}
                          </Text>
                          <Text
                            className="font-bold"
                            style={{
                              color:
                                Number(inv.AR) > Number(inv.Limit)
                                  ? colors.destructive
                                  : colors.green,
                            }}
                          >
                            {numberWithComma(inv.AR)}
                          </Text>
                        </View>
                      </View>

                      {/* Memo & History Actions */}
                      <View className="flex-row gap-2 mb-6">
                        <Button
                          onPress={() => {
                            setCurrentMemo({
                              invoice: inv.invoice,
                              memo: inv.Memo || '',
                            });
                            setMemoModalVisible(true);
                          }}
                          variant="outline"
                          className="flex-1 h-10 rounded-lg"
                        >
                          <View className="flex-row items-center">
                            <MessageSquare
                              size={16}
                              color={colors.foreground}
                              className="mr-2"
                            />
                            <Text className="text-sm font-medium text-foreground">
                              {t('approve.salesApprove.editMemo')}
                            </Text>
                          </View>
                        </Button>
                      </View>

                      {/* Items Section */}
                      <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        {t('approve.salesApprove.orderItems')}
                      </Text>
                      {inv.items.map((item: any, idx: number) => {
                        const s1 = parseInt(item.Stock1);
                        const s2 = parseInt(item.Stock2);
                        const s3 = parseInt(item.Stock3);
                        const rop = parseInt(item.ReorderPoint || '0');
                        let stockColor = colors.green;
                        if (s1 < 0 || s2 < 0 || s3 < 0)
                          stockColor = colors.destructive;
                        else if (s1 < rop) stockColor = colors.amber;

                        return (
                          <View
                            key={idx}
                            className="mb-3 p-3 bg-secondary/5 rounded-xl border border-border/50"
                          >
                            <View className="flex-row justify-between mb-2">
                              <Pressable
                                className="flex-1"
                                onPress={() =>
                                  fetchHistory(item.PKey, item.AccLoc)
                                }
                              >
                                <Text className="font-bold text-primary flex-row items-center">
                                  {item.Product_Name}{' '}
                                  <History size={10} color={colors.primary} />
                                </Text>
                              </Pressable>
                              <Text className="font-bold text-foreground">
                                {numberWithComma(item.CQty)} {item.Unit}
                              </Text>
                            </View>
                            <View className="flex-row gap-4 mt-2 pt-2 border-t border-border/20">
                              <View className="flex-1">
                                <Text className="text-[10px] text-muted-foreground font-bold">
                                  {t('element.price')}/{t('element.discount')}
                                </Text>
                                <Text className="text-xs font-medium text-foreground">
                                  {numberWithComma(item.Price)} |{' '}
                                  {numberWithComma(item.Discount)}
                                </Text>
                              </View>
                              <View className="flex-1">
                                <Text className="text-[10px] text-muted-foreground font-bold">
                                  {t('element.margin')}
                                </Text>
                                <Text
                                  className="text-xs font-bold"
                                  style={{
                                    color:
                                      item.Margin < 0
                                        ? colors.destructive
                                        : colors.green,
                                  }}
                                >
                                  {Number(item.Margin).toFixed(1)}%
                                </Text>
                              </View>
                              <View className="flex-1">
                                <Text className="text-[10px] text-muted-foreground font-bold">
                                  {t('element.stock')} (1|2|3)
                                </Text>
                                <Text
                                  className="text-xs font-bold"
                                  style={{ color: stockColor }}
                                >
                                  {item.Stock1}|{item.Stock2}|{item.Stock3}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Card>
              );
            })
          )}
          <View className="h-20" />
        </ScrollView>
      </View>

      {/* Modals are kept similar but with improved styling */}
      <Modal visible={memoModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center p-4 bg-black/60">
          <Card className="p-6 bg-card">
            <Text className="text-lg font-bold mb-4">
              {t('approve.salesApprove.editMemo')}: {currentMemo.invoice}
            </Text>
            <Input
              value={currentMemo.memo}
              onChangeText={txt =>
                setCurrentMemo({ ...currentMemo, memo: txt })
              }
              placeholder={t('approve.salesApprove.enterMemo')}
              multiline
              numberOfLines={4}
              className="mb-4"
            />
            <View className="flex-row gap-3">
              <Button
                label={t('element.save')}
                onPress={saveMemo}
                className="flex-1"
              />
              <Button
                label={t('element.cancel')}
                variant="outline"
                onPress={() => setMemoModalVisible(false)}
                className="flex-1"
              />
            </View>
          </Card>
        </View>
      </Modal>

      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card h-[80%] rounded-t-3xl overflow-hidden">
            <View className="p-4 border-b border-border flex-row justify-between items-center bg-secondary/5">
              <Text className="text-lg text-foreground font-bold">
                {t('approve.salesApprove.transactionHistory')}
              </Text>
              <View className="p-2 opacity-0">
                <X size={24} color={colors.foreground} />
              </View>
            </View>

            <View className="flex-1">
              {historyLoading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <FlatList
                  data={historyData}
                  contentContainerStyle={{ padding: 16 }}
                  keyExtractor={(item, idx) => idx.toString()}
                  ListEmptyComponent={
                    <Text className="text-center text-muted-foreground py-10">
                      {t('approve.salesApprove.noHistory')}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <Card className="mb-3 p-3 border-border/50">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs font-bold text-muted-foreground">
                          {dateFormatted(new Date(item.DateTr))}
                        </Text>
                        <Text className="text-xs font-bold text-primary">
                          {numberWithComma(item.Amount / item.CQty)} / Unit
                        </Text>
                      </View>
                      <Text className="font-bold text-foreground mb-1">
                        {item.CompanyName}
                      </Text>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs text-muted-foreground">
                          Order: {numberWithComma(item.CQty)} {item.Unit}
                        </Text>
                        <Text className="text-sm font-bold text-foreground">
                          Total: {numberWithComma(item.Amount)}
                        </Text>
                      </View>
                    </Card>
                  )}
                />
              )}
            </View>
            <View className="p-4 border-t border-border bg-card">
              <Button
                label={t('element.close')}
                onPress={() => setHistoryModalVisible(false)}
                variant="outline"
              />
            </View>
          </View>
        </View>
      </Modal>
      {isLoading && invoices.length > 0 && (
        <View className="absolute inset-0 bg-background/30 items-center justify-center">
          <View className="bg-card p-4 rounded-xl shadow-lg flex-row items-center border border-border">
            <ActivityIndicator color={colors.primary} />
            <Text className="ml-3 font-bold text-foreground">
              {t('approve.salesApprove.loadingCustomerData')}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
