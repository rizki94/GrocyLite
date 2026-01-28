import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Card } from '../../components/ui/card';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '../../components/ui/date-picker';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';

export function DebtPaymentsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<0 | 1>(0); // 0 = Current, 1 = Total

  const params = useMemo(
    () => ({
      params: { date: dateFormatted(date) },
    }),
    [date],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Current Debt
  const {
    data: currentDebtData,
    isLoading: loadingCurrent,
    fetchError: errorCurrent,
  } = useFetchWithParams('api/bridge/debt_payment', params, [date], refreshing);

  // Total Debt
  const {
    data: totalDebtData,
    isLoading: loadingTotal,
    fetchError: errorTotal,
  } = useFetchWithParams(
    'api/bridge/total_debt_payment',
    params,
    [date],
    refreshing,
  );

  const activeData = mode === 0 ? currentDebtData : totalDebtData;
  const isLoading = mode === 0 ? loadingCurrent : loadingTotal;
  const fetchError = mode === 0 ? errorCurrent : errorTotal;

  const totalAmount = useMemo(() => {
    if (!Array.isArray(activeData)) return 0;
    return activeData.reduce(
      (acc: number, item: any) =>
        acc + Number(mode === 0 ? item.Payments : item.Total),
      0,
    );
  }, [activeData, mode]);

  const renderItem = ({ item }: { item: any }) => (
    <Card className="mb-3 mx-4 p-4 border border-border/50 shadow-sm">
      <Text className="font-extrabold text-base text-foreground mb-2 uppercase tracking-tight">
        {item.CompanyName}
      </Text>
      <View className="flex-row justify-between items-center pt-2 border-t border-border/10">
        <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
          {t('debtPayments.totalBill')}
        </Text>
        <Text className="font-black text-primary text-lg">
          {numberWithComma(mode === 0 ? item.Payments : item.Total)}
        </Text>
      </View>
    </Card>
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
              {t('finance.accountPayableReport')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="mb-4">
            <DatePicker value={date} onChange={setDate} />
          </View>

          <View className="flex-row gap-2 mb-4">
            <Pressable
              className={`flex-1 flex-row items-center justify-center px-3 py-2.5 rounded-xl border ${mode === 0 ? 'bg-primary/10 border-primary' : 'bg-secondary/10 border-border/50'}`}
              onPress={() => setMode(0)}
            >
              <Text
                className={`text-xs font-black uppercase tracking-tight ${mode === 0 ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {t('debtPayments.currentDebt')}
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 flex-row items-center justify-center px-3 py-2.5 rounded-xl border ${mode === 1 ? 'bg-primary/10 border-primary' : 'bg-secondary/10 border-border/50'}`}
              onPress={() => setMode(1)}
            >
              <Text
                className={`text-xs font-black uppercase tracking-tight ${mode === 1 ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {t('debtPayments.totalDebt')}
              </Text>
            </Pressable>
          </View>

          <View className="p-6 rounded-2xl bg-primary border border-primary/20 shadow-lg items-center">
            <Text className="text-primary-foreground text-xs font-bold uppercase tracking-[2px] opacity-80 mb-2 text-center">
              {t('debtPayments.totalBill')} (
              {mode === 0
                ? t('debtPayments.currentDebt')
                : t('debtPayments.totalDebt')}
              )
            </Text>
            <Text className="font-black text-4xl text-white">
              {numberWithComma(totalAmount)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1 pt-4"
        data={
          fetchError && (!activeData || activeData.length === 0)
            ? []
            : Array.isArray(activeData)
              ? activeData
              : []
        }
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={renderItem}
        ListEmptyComponent={
          fetchError && (!activeData || activeData.length === 0) ? (
            <ConnectionError onRetry={onRefresh} message={fetchError} />
          ) : !isLoading ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                {t('general.resultNotAvailable')}
              </Text>
            </View>
          ) : null
        }
      />
      <Loading isLoading={isLoading} />
    </View>
  );
}
