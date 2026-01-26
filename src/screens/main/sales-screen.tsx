import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import {
  ClipboardCheck,
  FileBarChart,
  BarChart3,
  Ban,
  RotateCcw,
  Wallet,
  CreditCard,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import { usePermissions } from '../../hooks/use-permissions';
import { useTranslation } from 'react-i18next';

export function SalesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const { hasPermission } = usePermissions();

  const menuItems = [
    {
      title: t('approve.salesApprove.approveList'),
      icon: ClipboardCheck,
      color: colors.green,
      bgColor: 'bg-green-500/10 dark:bg-green-400/20',
      route: 'SalesApprove',
      permission: 'approve-invoice',
    },
    {
      title: t('sales.omzetReport'),
      icon: FileBarChart,
      color: colors.primary,
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      route: 'SalesReport',
      permission: 'sales-omzet-report',
    },
    {
      title: t('sales.profitLoss'),
      icon: BarChart3,
      color: colors.blue,
      bgColor: 'bg-blue-500/10 dark:bg-blue-400/20',
      route: 'Profit',
      permission: 'loss-profit-report',
    },
    {
      title: t('cancelTransaction.title'),
      icon: Ban,
      color: colors.destructive,
      bgColor: 'bg-destructive/10 dark:bg-destructive/20',
      route: 'CancelTransaction',
      permission: 'cancel-transaction',
    },
    {
      title: t('dashboard.salesReturn'),
      icon: RotateCcw,
      color: colors.amber,
      bgColor: 'bg-amber-500/10 dark:bg-amber-400/20',
      route: 'SalesReturn',
      permission: 'sales-return-list',
    },
    {
      title: t('dashboard.debtPayments'),
      icon: Wallet,
      color: colors.indigo,
      bgColor: 'bg-indigo-500/10 dark:bg-indigo-400/20',
      route: 'DebtPayments',
      permission: 'payment-ap-list',
    },
    {
      title: t('sales.creditPayments'),
      icon: CreditCard,
      color: colors.primary,
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      route: 'CreditPayments',
      permission: 'payment-ar-list',
    },
  ].filter(item => !item.permission || hasPermission(item.permission));

  return (
    <AppLayout title={t('sales.title')}>
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="flex-row flex-wrap justify-between">
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              className="w-[48%] mb-4 rounded-lg border border-border bg-card shadow-sm items-center justify-center p-6 active:bg-secondary/20"
              onPress={() => navigation.navigate(item.route)}
            >
              <View
                className={`w-14 h-14 ${item.bgColor} rounded-full items-center justify-center mb-3`}
              >
                <item.icon size={28} color={item.color} />
              </View>
              <Text className="text-center font-medium text-foreground">
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </AppLayout>
  );
}
