import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';
import moment from 'moment';
import { Card } from '../../components/ui/card';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';

export function PurchaseScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const [date, setDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [groupedPurchases, setGroupedPurchases] = useState<any[]>([]);

  const { data: purchaseData, isLoading } = useFetchWithParams(
    'api/bridge/purchase',
    { params: { date: dateFormatted(date) } },
    date,
    refreshing,
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  useEffect(() => {
    if (Array.isArray(purchaseData)) {
      const grouped: any = {};
      purchaseData.forEach((item: any) => {
        if (!grouped[item.CompanyName]) {
          grouped[item.CompanyName] = {
            CompanyName: item.CompanyName,
            Total: 0,
            items: [],
            expanded: false,
          };
        }
        grouped[item.CompanyName].Total += Number(item.Amount || 0);
        grouped[item.CompanyName].items.push(item);
      });
      setGroupedPurchases(Object.values(grouped));
    }
  }, [purchaseData]);

  const toggleExpand = (companyName: string) => {
    setGroupedPurchases(current =>
      current.map(c =>
        c.CompanyName === companyName ? { ...c, expanded: !c.expanded } : c,
      ),
    );
  };

  const grandTotal = groupedPurchases.reduce(
    (acc, curr) => acc + curr.Total,
    0,
  );

  return (
    <AppLayout title={t('dashboard.purchaseReport')}>
      <View className="px-4 mb-4">
        <View className="flex-row items-center justify-between bg-secondary/30 p-3 rounded-lg border border-border mb-3">
          <View className="flex-row items-center">
            <Calendar
              size={20}
              color={colors.mutedForeground}
              style={{ marginRight: 8 }}
            />
            <Text>{moment(date).format('DD MMM YYYY')}</Text>
          </View>
          <Pressable>
            <Text className="text-primary font-bold">
              {t('general.change')}
            </Text>
          </Pressable>
        </View>

        <View className="p-4 bg-secondary/20 rounded-lg">
          <Text className="text-lg font-bold">
            {t('element.grandTotal')}: {numberWithComma(grandTotal)}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
          />
        }
      >
        {groupedPurchases.map((comp, idx) => (
          <View
            key={idx}
            className="mb-3 bg-card border border-border rounded-lg overflow-hidden"
          >
            <Pressable
              className="p-3 flex-row items-center justify-between bg-secondary/10 active:bg-secondary/20"
              onPress={() => toggleExpand(comp.CompanyName)}
            >
              <View>
                <Text className="font-bold">{comp.CompanyName}</Text>
                <Text className="text-sm text-muted-foreground">
                  {t('element.total')}: {numberWithComma(comp.Total)}
                </Text>
              </View>
              {comp.expanded ? (
                <ChevronUp size={20} color={colors.foreground} />
              ) : (
                <ChevronDown size={20} color={colors.foreground} />
              )}
            </Pressable>

            {comp.expanded && (
              <View className="p-3">
                <View className="flex-row mb-2 border-b border-border/30 pb-1">
                  <Text className="flex-[2] text-xs font-bold">
                    {t('element.product')}
                  </Text>
                  <Text className="flex-1 text-xs font-bold text-right">
                    {t('element.qty')}
                  </Text>
                  <Text className="flex-1 text-xs font-bold text-right">
                    {t('element.total')}
                  </Text>
                </View>
                {comp.items.map((item: any, i: number) => (
                  <View
                    key={i}
                    className="flex-row py-1 border-b border-border/10"
                  >
                    <Text className="flex-[2] text-xs">
                      {item.Product_Name}
                    </Text>
                    <Text className="flex-1 text-xs text-right">
                      {numberWithComma(item.Qty)} {item.Unit}
                    </Text>
                    <Text className="flex-1 text-xs text-right">
                      {numberWithComma(item.Amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        <View className="h-10" />
      </ScrollView>
    </AppLayout>
  );
}
