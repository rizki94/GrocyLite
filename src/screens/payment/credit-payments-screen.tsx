import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card } from '../../components/ui/card';
import { useFetch } from '../../hooks/use-fetch';
import { numberWithComma } from '../../utils/helpers';
import { Search, Filter, X } from 'lucide-react-native';
import { Input } from '../../components/ui/input';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '../../lib/colors';
import { Loading } from '../../components/ui/loading';

export function CreditPaymentsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [showOverdueOnly, setShowOverdueOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: creditPayments, isLoading } = useFetch(
    'api/bridge/credit_payment',
    refreshing,
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const filteredData = useMemo(() => {
    if (!Array.isArray(creditPayments)) return [];

    let result = creditPayments;

    // Base rules from original code
    const pattern = 'BSR';

    // 1. Base filter (always applied?)
    // Original code applied this useEffect logic:
    /*
          const newFilter = creditPayments.filter(
            item =>
                item.CompanyName !== 'AKI GUDANG' &&
                item.CompanyName !== 'GUDANG PAGARSIH' &&
                item.CompanyName !== 'AKI GUDANG KILOAN' &&
                item.NoTr.indexOf(pattern) === -1 &&
                new Date().setHours(0, 0, 0, 0) > new Date(item.DueDate).getTime(),
            );
         */
    // Wait, the original code logic is confusing.
    // useEffect sets `filtered` to "OD Only" by default.
    // `filterStatus` toggles between "OD Only" and "All".

    // Let's replicate the logic cleanly.

    // Exclude specific companies/patterns always? Or only when filter is checked?
    // Original: The useEffect creates a `newFilter` (meaning Overdue items essentially).
    // If checked (Overdue), use `newFilter`. Else use raw `creditPayments`.

    // Wait, the logic inside useEffect includes: `new Date().setHours(...) > new Date(item.DueDate).getTime()`.
    // This effectively filters for OVERDUE items.

    if (showOverdueOnly) {
      result = result.filter(item => {
        const isOverdue =
          new Date().setHours(0, 0, 0, 0) > new Date(item.DueDate).getTime();
        const isExcluded =
          item.CompanyName === 'AKI GUDANG' ||
          item.CompanyName === 'GUDANG PAGARSIH' ||
          item.CompanyName === 'AKI GUDANG KILOAN' ||
          (item.NoTr || '').indexOf(pattern) !== -1;

        return isOverdue && !isExcluded;
      });
    }

    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toUpperCase();
      result = result.filter(item =>
        (item.CompanyName || '').toUpperCase().includes(q),
      );
    }

    return result;
  }, [creditPayments, showOverdueOnly, searchQuery]);

  const totalBalance = filteredData.reduce(
    (acc, item) => acc + Number(item.balance || 0),
    0,
  );

  return (
    <AppLayout title={t('dashboard.creditReport')} showBack>
      <View className="px-4 pt-4 pb-2">
        {/* Controls */}
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1">
            <Input
              placeholder={t('general.search')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-card h-10 border-0 shadow-sm"
              leftIcon={<Search size={16} color={colors.mutedForeground} />}
            />
          </View>
          <Pressable
            className={`flex-row items-center px-3 h-10 rounded-lg border ${showOverdueOnly ? 'bg-destructive/10 border-destructive' : 'bg-green-500/10 border-green-500'}`}
            onPress={() => setShowOverdueOnly(!showOverdueOnly)}
          >
            <Filter
              size={16}
              color={showOverdueOnly ? colors.destructive : colors.green}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`text-xs font-bold ${showOverdueOnly ? 'text-destructive' : 'text-green-500'}`}
            >
              {showOverdueOnly ? t('element.od') : t('general.all')}
            </Text>
          </Pressable>
        </View>

        {/* Summary */}
        <Card className="mb-4 p-4 bg-primary">
          <Text className="text-primary-foreground text-sm font-medium opacity-90">
            {t('element.total')} (
            {showOverdueOnly ? t('element.od') : t('general.all')})
          </Text>
          <Text className="text-3xl font-bold text-primary-foreground mt-1">
            {numberWithComma(totalBalance)}
          </Text>
        </Card>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => (item.NoTr || index).toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const isOverdue =
            new Date().setHours(0, 0, 0, 0) > new Date(item.DueDate).getTime();

          return (
            <Card className="mb-3 p-3 item-center">
              <View className="flex-row justify-between mb-1">
                <Text className="font-bold text-base text-foreground flex-1 pr-2">
                  {item.CompanyName}
                </Text>
                <View
                  className={`px-2 py-1 rounded text-xs ${item.balance > 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}
                >
                  <Text
                    className={`text-xs font-bold ${item.balance > 0 ? 'text-destructive' : 'text-green-500'}`}
                  >
                    AR: {numberWithComma(item.balance)}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center text-sm text-muted-foreground mt-2 pt-2 border-t border-border/30">
                <Text className="text-xs text-muted-foreground">
                  {item.NoTr}
                </Text>
                <View className="flex-row gap-3">
                  <Text className="text-xs text-muted-foreground">
                    TOP: {item.TermTOP}
                  </Text>
                  <Text
                    className={`text-xs font-bold ${isOverdue ? 'text-destructive' : 'text-green-500'}`}
                  >
                    {item.DateDiff} {t('element.days')}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
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
