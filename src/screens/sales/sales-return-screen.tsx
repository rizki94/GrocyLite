import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card } from '../../components/ui/card';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import { Calendar, ChevronDown, ChevronUp, Package } from 'lucide-react-native';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '../../lib/colors';
import { DatePicker } from '../../components/ui/date-picker';

export function SalesReturnScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Memoize params to avoid infinite loop in useFetchWithParams
  const params = useMemo(
    () => ({
      params: {
        startDate: dateFormatted(startDate),
        endDate: dateFormatted(endDate),
      },
    }),
    [startDate, endDate],
  );

  const { data: salesReturns, isLoading } = useFetchWithParams(
    'api/bridge/sales_return',
    params,
    startDate,
    endDate,
    refreshing,
  );

  const [expandedCompanies, setExpandedCompanies] = useState<
    Record<string, boolean>
  >({});

  const toggleExpand = (companyName: string) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyName]: !prev[companyName],
    }));
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const groupedData = useMemo(() => {
    if (!Array.isArray(salesReturns)) return [];

    const groups: Record<
      string,
      { CompanyName: string; Total: number; Items: any[] }
    > = {};

    salesReturns.forEach((item: any) => {
      const company = item.CompanyName || 'Unknown';
      if (!groups[company]) {
        groups[company] = {
          CompanyName: company,
          Total: 0,
          Items: [],
        };
      }
      groups[company].Total += Number(item.Amount || 0);
      groups[company].Items.push(item);
    });

    return Object.values(groups);
  }, [salesReturns]);

  const grandTotal = groupedData.reduce((acc, curr) => acc + curr.Total, 0);

  return (
    <AppLayout title={t('dashboard.salesReturn')} showBack>
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Date Selector */}
        <View className="mb-4 pt-4 flex-row gap-3">
          <View className="flex-1">
            <DatePicker
              label={t('general.from')}
              value={startDate}
              onChange={setStartDate}
            />
          </View>
          <View className="flex-1">
            <DatePicker
              label={t('general.to')}
              value={endDate}
              onChange={setEndDate}
            />
          </View>
        </View>

        {/* Grand Total */}
        <View className="mb-6 p-5 bg-primary rounded-2xl shadow-lg border border-primary/20">
          <Text className="text-primary-foreground text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
            {t('element.grandTotal')}
          </Text>
          <Text className="text-4xl font-black text-white mt-1">
            {numberWithComma(grandTotal)}
          </Text>
        </View>

        {/* List */}
        <View className="mb-8">
          {groupedData.map((group, index) => (
            <View
              key={index}
              className={cn(
                'mb-4 overflow-hidden rounded-2xl border bg-card',
                expandedCompanies[group.CompanyName]
                  ? 'border-primary/40'
                  : 'border-border/60',
              )}
            >
              <Pressable
                className={cn(
                  'p-4 flex-row items-center justify-between transition-all',
                  expandedCompanies[group.CompanyName]
                    ? 'bg-secondary/10'
                    : 'bg-card',
                )}
                onPress={() => toggleExpand(group.CompanyName)}
              >
                <View className="flex-1 mr-4">
                  <Text className="font-extrabold text-base text-foreground mb-1">
                    {group.CompanyName}
                  </Text>
                  <Text className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    {group.Items.length} {t('element.items')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-black text-lg text-primary mb-1">
                    {numberWithComma(group.Total)}
                  </Text>
                  {expandedCompanies[group.CompanyName] ? (
                    <ChevronUp size={20} color={colors.primary} />
                  ) : (
                    <ChevronDown size={20} color={colors.mutedForeground} />
                  )}
                </View>
              </Pressable>

              {expandedCompanies[group.CompanyName] && (
                <View className="border-t border-border/40">
                  <View className="flex-row bg-secondary/30 px-4 py-2 border-b border-border/30">
                    <Text className="flex-[2] text-[10px] font-extrabold text-muted-foreground uppercase">
                      {t('element.product')}
                    </Text>
                    <Text className="flex-1 text-[10px] font-extrabold text-muted-foreground uppercase text-right mr-2">
                      {t('element.qty')}
                    </Text>
                    <Text className="flex-1 text-[10px] font-extrabold text-muted-foreground uppercase">
                      {t('element.unit')}
                    </Text>
                    <Text className="flex-1 text-[10px] font-extrabold text-muted-foreground uppercase text-right">
                      {t('element.total')}
                    </Text>
                  </View>
                  {group.Items.map((item, idx) => (
                    <View
                      key={idx}
                      className="flex-row px-4 py-3 border-b border-border/20 items-center hover:bg-secondary/5"
                    >
                      <View className="flex-[2] mr-1">
                        <Text className="text-xs font-bold text-foreground mb-0.5">
                          {item.Product_Name}
                        </Text>
                        <Text
                          className="text-[10px] text-muted-foreground"
                          numberOfLines={1}
                        >
                          {item.Descr}
                        </Text>
                      </View>
                      <Text className="flex-1 text-xs font-medium text-foreground text-right mr-2">
                        {numberWithComma(item.Qty)}
                      </Text>
                      <Text className="flex-1 text-xs text-muted-foreground font-medium uppercase">
                        {item.Unit}
                      </Text>
                      <Text className="flex-1 text-xs font-bold text-foreground text-right">
                        {numberWithComma(item.Amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </AppLayout>
  );
}
