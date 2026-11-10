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
  Receipt,
  CheckCircle2,
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const menuItems = [
    {
      title: 'Pelunasan Piutang',
      description: 'Input pelunasan faktur & retur piutang customer',
      icon: CheckCircle2,
      color: colors.green,
      bgColor: 'bg-green-500/10 dark:bg-green-400/20',
      route: 'PelunasanPiutang',
      permission: ['4pilar-pelunasan-piutang', 'payment-ar-list'],
    },
    {
      title: 'Pelunasan Hutang',
      description: 'Input pelunasan faktur & retur hutang supplier',
      icon: Receipt,
      color: colors.amber,
      bgColor: 'bg-amber-500/10 dark:bg-amber-400/20',
      route: 'PelunasanHutang',
      permission: ['4pilar-pelunasan-hutang', 'payment-ap-list'],
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
      title: t('finance.accountPayableReport'),
      description: t('finance.accountPayableReport'),
      icon: Wallet,
      color: colors.indigo,
      bgColor: 'bg-indigo-500/10 dark:bg-indigo-400/20',
      route: 'DebtPayments',
      permission: 'payment-ap-list',
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

  const isLoading = false;
  const fetchError = null;

  const hasNoData = true;

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
