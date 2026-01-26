import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { FileText, Package } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import { usePermissions } from '../../hooks/use-permissions';
import { useTranslation } from 'react-i18next';

export function WarehouseScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const { hasPermission } = usePermissions();

  const menuItems = [
    {
      title: t('warehouse.stockOpname.title'),
      icon: FileText,
      color: colors.primary,
      bgColor: 'bg-primary/10',
      route: 'StockOpnameList',
      permission: 'stock-opname-list',
    },
    {
      title: t('inventory.title'),
      icon: Package,
      color: colors.amber,
      bgColor: 'bg-amber-500/10 dark:bg-amber-400/20',
      route: 'Products',
      permission: 'product-stock-list',
    },
    // Add more warehouse items here later if needed
  ].filter(item => !item.permission || hasPermission(item.permission));

  return (
    <AppLayout title={t('warehouse.title')}>
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
