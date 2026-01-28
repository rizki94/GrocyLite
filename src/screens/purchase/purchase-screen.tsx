import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import {
  ArrowLeft,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import { DatePicker } from '../../components/ui/date-picker';
import { cn } from '../../lib/utils';

export function PurchaseScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);

  const {
    data: purchaseData,
    isLoading,
    fetchError,
  } = useFetchWithParams(
    'api/bridge/purchase',
    { params: { date: dateFormatted(date) } },
    [date],
    refreshing,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const groupedPurchases = useMemo(() => {
    const list = Array.isArray(purchaseData)
      ? purchaseData
      : purchaseData && typeof purchaseData === 'object'
        ? Object.values(purchaseData)
        : [];

    if (list.length === 0) return [];

    const grouped: Record<string, any> = {};
    list.forEach((item: any) => {
      if (!item) return;
      const name = item.CompanyName || item.companyname || 'Unknown';
      if (!grouped[name]) {
        grouped[name] = {
          CompanyName: name,
          Total: 0,
          items: [],
        };
      }
      const amount = Number(item.Amount ?? item.amount ?? 0);
      grouped[name].Total += amount;
      grouped[name].items.push({
        ...item,
        Product_Name: item.Product_Name || item.product_name || 'Unknown',
        Unit: item.Unit || item.unit || '-',
        Amount: amount,
        Qty: Number(item.Qty ?? item.qty ?? 0),
      });
    });
    return Object.values(grouped);
  }, [purchaseData]);

  const toggleExpand = (companyName: string) => {
    setExpandedCompanies(prev =>
      prev.includes(companyName)
        ? prev.filter(c => c !== companyName)
        : [...prev, companyName],
    );
  };

  const grandTotal = useMemo(() => {
    return groupedPurchases.reduce((acc, curr) => acc + curr.Total, 0);
  }, [groupedPurchases]);

  const renderGroup = ({ item: comp }: { item: any }) => {
    const isExpanded = expandedCompanies.includes(comp.CompanyName);
    return (
      <View className="mb-4 mx-4 border border-border/50 bg-card rounded-3xl shadow-sm overflow-hidden">
        <Pressable
          className={cn(
            'p-4 flex-row items-center justify-between active:bg-secondary/5',
            isExpanded && 'bg-secondary/10',
          )}
          onPress={() => toggleExpand(comp.CompanyName)}
        >
          <View className="flex-1 pr-4">
            <Text className="font-extrabold text-foreground uppercase tracking-tight">
              {comp.CompanyName}
            </Text>
            <Text className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
              {t('element.total')}: {numberWithComma(comp.Total)}
            </Text>
          </View>
          <View className="w-8 h-8 rounded-full bg-secondary/10 items-center justify-center">
            {isExpanded ? (
              <ChevronUp size={16} color={colors.foreground} />
            ) : (
              <ChevronDown size={16} color={colors.foreground} />
            )}
          </View>
        </Pressable>

        {isExpanded && (
          <View className="p-4 bg-card/50">
            <View className="flex-row mb-3 pb-2 border-b border-border/10">
              <Text className="flex-[2] text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                {t('element.product')}
              </Text>
              <Text className="flex-1 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                {t('element.qty')}
              </Text>
              <Text className="flex-1 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">
                {t('element.total')}
              </Text>
            </View>
            {comp.items.map((item: any, i: number) => (
              <View
                key={i}
                className={cn(
                  'flex-row py-2.5',
                  i !== comp.items.length - 1 && 'border-b border-border/5',
                )}
              >
                <Text className="flex-[2] text-xs font-bold text-foreground pr-2">
                  {item.Product_Name}
                </Text>
                <Text className="flex-1 text-xs font-black text-muted-foreground text-right">
                  {numberWithComma(item.Qty)}
                  <Text className="text-[10px] font-bold"> {item.Unit}</Text>
                </Text>
                <Text className="flex-1 text-xs font-black text-primary text-right">
                  {numberWithComma(item.Amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

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
              {t('dashboard.purchaseReport')}
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

          <View className="p-6 rounded-2xl bg-primary border border-primary/20 shadow-lg items-center">
            <Text className="text-primary-foreground text-xs font-bold uppercase tracking-[2px] opacity-80 mb-2">
              {t('element.grandTotal')}
            </Text>
            <Text className="font-black text-4xl text-white">
              {numberWithComma(grandTotal)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1 pt-4"
        data={
          fetchError && groupedPurchases.length === 0 ? [] : groupedPurchases
        }
        keyExtractor={item => item.CompanyName}
        renderItem={renderGroup}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          fetchError && groupedPurchases.length === 0 ? (
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
