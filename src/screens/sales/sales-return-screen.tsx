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
        <Card className="mb-6 p-4 bg-primary">
          <Text className="text-primary-foreground text-sm font-medium opacity-90">
            {t('element.grandTotal')}
          </Text>
          <Text className="text-3xl font-bold text-primary-foreground mt-1">
            {numberWithComma(grandTotal)}
          </Text>
        </Card>

        {/* List */}
        <View className="mb-8">
          {groupedData.map((group, index) => (
            <Card
              key={index}
              className="mb-3 overflow-hidden border border-border"
            >
              <Pressable
                className="p-4 flex-row items-center justify-between bg-card active:bg-secondary/50"
                onPress={() => toggleExpand(group.CompanyName)}
              >
                <View className="flex-1">
                  <Text className="font-bold text-foreground text-foreground">
                    {group.CompanyName}
                  </Text>
                  <Text className="text-muted-foreground text-xs mt-1">
                    {group.Items.length} {t('element.items')}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className="font-bold text-primary">
                    {numberWithComma(group.Total)}
                  </Text>
                  {expandedCompanies[group.CompanyName] ? (
                    <ChevronUp size={20} color={colors.mutedForeground} />
                  ) : (
                    <ChevronDown size={20} color={colors.mutedForeground} />
                  )}
                </View>
              </Pressable>

              {expandedCompanies[group.CompanyName] && (
                <View className="bg-secondary/10 border-t border-border">
                  <View className="flex-row bg-secondary/30 p-2 border-b border-border/30">
                    <Text className="flex-[2] text-xs font-bold text-muted-foreground">
                      {t('element.product')}
                    </Text>
                    <Text className="flex-1 text-xs font-bold text-muted-foreground text-right mr-2">
                      {t('element.qty')}
                    </Text>
                    <Text className="flex-1 text-xs font-bold text-muted-foreground">
                      {t('element.unit')}
                    </Text>
                    <Text className="flex-1 text-xs font-bold text-muted-foreground text-right">
                      {t('element.total')}
                    </Text>
                  </View>
                  {group.Items.map((item, idx) => (
                    <View
                      key={idx}
                      className="flex-row p-3 border-b border-border/20 items-center"
                    >
                      <View className="flex-[2]">
                        <Text className="text-sm font-medium text-foreground">
                          {item.Product_Name}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {item.Descr}
                        </Text>
                      </View>
                      <Text className="flex-1 text-sm text-foreground text-right mr-2">
                        {numberWithComma(item.Qty)}
                      </Text>
                      <Text className="flex-1 text-sm text-muted-foreground">
                        {item.Unit}
                      </Text>
                      <Text className="flex-1 text-sm font-bold text-foreground text-right">
                        {numberWithComma(item.Amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </View>
      </ScrollView>
    </AppLayout>
  );
}
