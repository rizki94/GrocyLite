import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  ClipboardCheck,
  FileBarChart,
  BarChart3,
  Ban,
  RotateCcw,
  Wallet,
  CreditCard,
  ArrowRight,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import { usePermissions } from '../../hooks/use-permissions';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFetch, useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';

export function SalesScreen() {
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
      title: t('approve.salesApprove.approveList'),
      description: t('approve.salesApprove.invoicesPending'),
      icon: ClipboardCheck,
      color: colors.green,
      bgColor: 'bg-green-500/10 dark:bg-green-400/20',
      route: 'SalesApprove',
      permission: 'approve-invoice',
    },
    {
      title: t('sales.omzetReport'),
      description: t('sales.omzetReport'),
      icon: FileBarChart,
      color: colors.primary,
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      route: 'SalesReport',
      permission: 'sales-omzet-report',
    },
    {
      title: t('sales.profitLoss'),
      description: t('sales.profitLoss'),
      icon: BarChart3,
      color: colors.blue,
      bgColor: 'bg-blue-500/10 dark:bg-blue-400/20',
      route: 'Profit',
      permission: 'loss-profit-report',
    },
    {
      title: t('dashboard.salesReturn'),
      description: t('dashboard.salesReturn'),
      icon: RotateCcw,
      color: colors.amber,
      bgColor: 'bg-amber-500/10 dark:bg-amber-400/20',
      route: 'SalesReturn',
      permission: 'sales-return-list',
    },
  ].filter(item => !item.permission || hasPermission(item.permission));

  const isLoading = false;

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
            {t('sales.title')}
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
        {false ? (
          <ConnectionError onRetry={onRefresh} message={''} />
        ) : (
          <>
            <Text className="text-xs font-black text-muted-foreground uppercase tracking-[3px] mb-4 ml-1">
              Sales Operations MENU
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
