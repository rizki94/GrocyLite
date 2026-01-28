import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Wallet,
  CreditCard,
  FileText,
  RotateCcw,
  ArrowRight,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import { usePermissions } from '../../hooks/use-permissions';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFetch } from '../../hooks/use-fetch';
import { numberWithComma } from '../../utils/helpers';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';

export function FinanceScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();
  const { hasPermission } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch AR Summary
  const {
    data: arSummary,
    isLoading: loadingAr,
    fetchError: errorAr,
  } = useFetch('api/bridge/dashboard_credit_payment', refreshing);

  // Fetch AP Summary
  const {
    data: apSummary,
    isLoading: loadingAp,
    fetchError: errorAp,
  } = useFetch('api/bridge/dashboard_debt_payment', refreshing);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const totalArBalance = Array.isArray(arSummary)
    ? arSummary.reduce(
        (acc: number, curr: any) => acc + Number(curr.balance),
        0,
      )
    : 0;

  const totalApBalance = Array.isArray(apSummary)
    ? apSummary.reduce((acc: number, curr: any) => acc + Number(curr.Total), 0)
    : 0;

  const menuItems = [
    {
      title: t('finance.accountPayableReport'),
      description: t('finance.accountPayableReport'),
      icon: Wallet,
      color: colors.indigo,
      bgColor: 'bg-indigo-500/10 dark:bg-indigo-400/20',
      route: 'DebtPayments',
      permission: 'payment-ap-list',
    },
    {
      title: t('finance.accountReceivableReport'),
      description: t('finance.accountReceivableReport'),
      icon: CreditCard,
      color: colors.primary,
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      route: 'CreditPayments',
      permission: 'payment-ar-list',
    },
    {
      title: t('dashboard.purchaseReport'),
      description: t('dashboard.purchaseReport'),
      icon: FileText,
      color: colors.blue,
      bgColor: 'bg-blue-500/10 dark:bg-blue-400/20',
      route: 'Purchase',
      permission: 'purchase-report',
    },
  ].filter(item => !item.permission || hasPermission(item.permission));

  const isLoading = loadingAr || loadingAp;
  const fetchError = errorAr || errorAp;

  const hasNoData =
    (!arSummary || arSummary.length === 0) &&
    (!apSummary || apSummary.length === 0);

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
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-2xl font-black text-foreground tracking-tighter">
            {t('finance.title')}
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 bg-secondary/20 rounded-full"
          >
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {fetchError && hasNoData ? (
          <ConnectionError onRetry={onRefresh} message={fetchError} />
        ) : (
          <>
            {/* Summary Row */}
            <View className="flex-row gap-4 mb-8">
              <Pressable
                className="flex-1"
                onPress={() => navigation.navigate('CreditPayments')}
              >
                <View className="p-4 rounded-3xl border border-primary/30 bg-primary/5">
                  <View className="p-2 rounded-2xl bg-primary/10 w-10 h-10 items-center justify-center mb-3">
                    <CreditCard size={20} color={colors.primary} />
                  </View>
                  <Text className="text-xl font-black text-foreground tracking-tight">
                    {numberWithComma(totalArBalance)}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                    Total AR
                  </Text>
                </View>
              </Pressable>

              <Pressable
                className="flex-1"
                onPress={() => navigation.navigate('DebtPayments')}
              >
                <View className="p-4 rounded-3xl border border-indigo-500/30 bg-indigo-500/5">
                  <View className="p-2 rounded-2xl bg-indigo-500/10 w-10 h-10 items-center justify-center mb-3">
                    <Wallet size={20} color={colors.indigo} />
                  </View>
                  <Text className="text-xl font-black text-foreground tracking-tight">
                    {numberWithComma(totalApBalance)}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                    Total AP
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text className="text-xs font-black text-muted-foreground uppercase tracking-[3px] mb-4 ml-1">
              {t('finance.title')} Menu
            </Text>

            <View className="flex-row flex-wrap justify-between">
              {menuItems.map((item, index) => (
                <Pressable
                  key={index}
                  className="w-[48%] mb-4 active:scale-95"
                  onPress={() => navigation.navigate(item.route)}
                >
                  <View className="rounded-3xl border border-border/60 bg-card shadow-sm p-5 h-[140px] justify-between">
                    <View
                      className={cn(
                        'w-12 h-12 rounded-2xl items-center justify-center',
                        item.bgColor,
                      )}
                    >
                      <item.icon size={24} color={item.color} />
                    </View>
                    <View>
                      <Text
                        className="font-black text-foreground text-[11px] leading-4 tracking-wider"
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <Loading isLoading={isLoading} />
    </View>
  );
}
