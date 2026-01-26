import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card } from '../../components/ui/card';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '../../components/ui/date-picker';
import { Loading } from '../../components/ui/loading';

export function DebtPaymentsScreen() {
  const { t } = useTranslation();
  const [date, setDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<0 | 1>(0); // 0 = Current, 1 = Total

  const params = useMemo(
    () => ({
      params: { date: dateFormatted(date) },
    }),
    [date],
  );

  // Current Debt
  const { data: currentDebtData, isLoading: loadingCurrent } =
    useFetchWithParams('api/bridge/debt_payment', params, date, refreshing);

  // Total Debt
  const { data: totalDebtData, isLoading: loadingTotal } = useFetchWithParams(
    'api/bridge/total_debt_payment',
    params,
    date,
    refreshing,
  );

  const activeData = mode === 0 ? currentDebtData : totalDebtData;
  const isLoading = mode === 0 ? loadingCurrent : loadingTotal;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const totalAmount = Array.isArray(activeData)
    ? activeData.reduce(
        (acc: number, item: any) =>
          acc + Number(mode === 0 ? item.Payments : item.Total),
        0,
      )
    : 0;

  return (
    <AppLayout title={t('dashboard.debtPayments')} showBack>
      <View className="px-4 pt-4 pb-2">
        {/* Date Selector */}
        <View className="mb-4">
          <DatePicker value={date} onChange={setDate} />
        </View>

        {/* Mode Toggle */}
        <View className="flex-row gap-2 mb-4">
          <Pressable
            className={`flex-1 flex-row items-center justify-center px-3 py-2.5 rounded-lg border ${mode === 0 ? 'bg-primary/10 border-primary' : 'bg-secondary/30 border-border'}`}
            onPress={() => setMode(0)}
          >
            <Text
              className={`text-sm font-bold ${mode === 0 ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {t('debtPayments.currentDebt')}
            </Text>
          </Pressable>

          <Pressable
            className={`flex-1 flex-row items-center justify-center px-3 py-2.5 rounded-lg border ${mode === 1 ? 'bg-primary/10 border-primary' : 'bg-secondary/30 border-border'}`}
            onPress={() => setMode(1)}
          >
            <Text
              className={`text-sm font-bold ${mode === 1 ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {t('debtPayments.totalDebt')}
            </Text>
          </Pressable>
        </View>

        {/* Summary Card */}
        <Card className="mb-4 p-4 bg-primary">
          <Text className="text-primary-foreground text-sm font-medium opacity-90">
            {t('debtPayments.totalBill')} (
            {mode === 0
              ? t('debtPayments.currentDebt')
              : t('debtPayments.totalDebt')}
            )
          </Text>
          <Text className="text-3xl font-bold text-primary-foreground mt-1">
            {numberWithComma(totalAmount)}
          </Text>
        </Card>
      </View>

      <FlatList
        data={Array.isArray(activeData) ? activeData : []}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Card className="mb-3 p-4">
            <Text className="font-bold text-lg text-foreground mb-2">
              {item.CompanyName}
            </Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-muted-foreground text-sm">
                {t('debtPayments.totalBill')}
              </Text>
              <Text className="font-bold text-primary text-base">
                {numberWithComma(mode === 0 ? item.Payments : item.Total)}
              </Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View className="py-10 items-center justify-center">
            <Text className="text-muted-foreground">
              {t('general.resultNotAvailable')}
            </Text>
          </View>
        }
      />
      <Loading isLoading={isLoading} />
    </AppLayout>
  );
}
