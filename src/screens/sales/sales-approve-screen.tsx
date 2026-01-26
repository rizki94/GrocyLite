import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma, cls } from '../../utils/helpers';
import { useThemeColor } from '../../lib/colors';
import {
  ArrowLeft,
  RotateCcw,
  ChevronRight,
  Search,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { DatePicker } from '../../components/ui/date-picker';
import { Input } from '../../components/ui/input';
import { Loading } from '../../components/ui/loading';
import { useTranslation } from 'react-i18next';
interface SalesApproveItem {
  CompanyName: string;
  Amount: number;
  Profit: number;
  Invoices: number;
}

export function SalesApproveScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const [date, setDate] = useState(new Date());
  const [status, setStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: salesList, isLoading } = useFetchWithParams(
    'api/bridge/approve_list',
    {
      params: {
        date: dateFormatted(date),
        status: status ? 'true' : 'false',
      },
    },
    { date, status },
    refreshing,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const groupedList = useMemo(() => {
    const list = Array.isArray(salesList)
      ? salesList
      : Object.values(salesList || {});

    if (list.length === 0) return [];

    const result: Record<string, SalesApproveItem> = {};
    list.forEach((item: any) => {
      if (!item) return;
      const name = item.CompanyName || 'Unknown';
      if (!result[name]) {
        result[name] = { CompanyName: name, Amount: 0, Profit: 0, Invoices: 0 };
      }
      result[name].Amount += Number(item.Amount || 0);
      result[name].Profit += Number(item.Profit || 0);
      result[name].Invoices += Number(item.Invoices || 1);
    });

    return Object.values(result).filter(item =>
      item.CompanyName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [salesList, searchQuery]);

  const summary = useMemo(() => {
    const totalAmount = groupedList.reduce((acc, curr) => acc + curr.Amount, 0);
    const totalProfit = groupedList.reduce((acc, curr) => acc + curr.Profit, 0);
    return { totalAmount, totalProfit };
  }, [groupedList]);

  const activeTabStyle = {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: SalesApproveItem;
    index: number;
  }) => (
    <Card className="mb-4 mx-1 overflow-hidden border border-border bg-card shadow-sm">
      <TouchableOpacity
        className="p-4 active:bg-secondary/5"
        onPress={() =>
          navigation.navigate('ApproveDetail', {
            contactName: item.CompanyName,
            _date: date.toISOString(),
            contactList: groupedList.map(g => g.CompanyName),
            initialIndex: index,
          })
        }
        activeOpacity={0.7}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-2">
            <Text
              className="text-lg font-bold text-foreground"
              numberOfLines={1}
            >
              {item.CompanyName}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {item.Invoices} {t('approve.salesApprove.invoicesPending')}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-lg font-bold text-primary">
              {numberWithComma(item.Amount)}
            </Text>
            <Text className="text-[10px] text-muted-foreground uppercase font-bold">
              {t('approve.salesApprove.totalAmount')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between pt-3 border-t border-border/50">
          <View className="flex-row items-center">
            <View
              className={cls(
                `p-1.5 rounded-full mr-2 ${item.Profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`,
              )}
            >
              {item.Profit >= 0 ? (
                <TrendingUp size={12} color={colors.green} />
              ) : (
                <TrendingDown size={12} color={colors.destructive} />
              )}
            </View>
            <View>
              <Text className="text-[10px] text-muted-foreground uppercase font-bold">
                {t('element.profit')}
              </Text>
              <Text
                className="text-xs font-bold"
                style={{
                  color: item.Profit >= 0 ? colors.green : colors.destructive,
                }}
              >
                {numberWithComma(item.Profit)}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center bg-secondary/10 px-3 py-1.5 rounded-lg">
            <Text className="text-xs font-bold text-primary mr-1">
              {t('approve.salesApprove.viewDetails')}
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View className="bg-card border-b border-border">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="p-2 -ml-2 rounded-full active:bg-secondary/20"
            >
              <ArrowLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground ml-2">
              {t('approve.salesApprove.approveList')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 rounded-full active:bg-secondary/20"
          >
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder={t('element.date')}
              />
            </View>
          </View>

          <View className="flex-row bg-secondary/10 p-1 rounded-xl">
            <TouchableOpacity
              onPress={() => setStatus(false)}
              className="flex-1 py-2 items-center rounded-lg"
              style={!status ? activeTabStyle : {}}
            >
              <Text
                className={cls(
                  `text-sm font-bold ${!status ? 'text-primary' : 'text-muted-foreground'}`,
                )}
              >
                {t('approve.salesApprove.notApproved')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStatus(true)}
              className="flex-1 py-2 items-center rounded-lg"
              style={status ? activeTabStyle : {}}
            >
              <Text
                className={cls(
                  `text-sm font-bold ${status ? 'text-primary' : 'text-muted-foreground'}`,
                )}
              >
                {t('approve.salesApprove.approved')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-1 p-4">
        {/* Dynamic Summary Dashboard */}
        <View className="flex-row gap-3 mb-4">
          <Card className="flex-1 p-3 bg-primary/5 border-primary/20">
            <Text className="text-[10px] uppercase font-bold text-primary mb-1">
              {t('approve.salesApprove.totalSales')}
            </Text>
            <Text className="text-lg font-bold text-primary">
              {numberWithComma(summary.totalAmount)}
            </Text>
          </Card>
          <Card className="flex-1 p-3 bg-green-500/5 border-green-500/20">
            <Text className="text-[10px] uppercase font-bold text-green-600 mb-1">
              {t('approve.salesApprove.totalProfit')}
            </Text>
            <Text className="text-lg font-bold text-green-600">
              {numberWithComma(summary.totalProfit)}
            </Text>
          </Card>
        </View>
        <View className="relative mb-4">
          <View className="absolute left-3 top-2.5 z-10">
            <Search size={18} color={colors.mutedForeground} />
          </View>
          <Input
            placeholder={t('general.search')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="h-10 pl-10 bg-background border border-border rounded-lg"
          />
        </View>

        <FlatList
          data={groupedList}
          renderItem={renderItem}
          keyExtractor={item => item.CompanyName}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="text-muted-foreground">
                {t('general.resultNotAvailable')}
              </Text>
            </View>
          }
        />

        <Loading isLoading={isLoading} />
      </View>
    </SafeAreaView>
  );
}
