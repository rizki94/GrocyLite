import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { useThemeColor } from '../../lib/colors';
import { Search, X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface CustomerSearchModalProps {
  visible: boolean;
  onClose: () => void;
  customers: any[];
  onSelect: (customer: any) => void;
  selectedId?: number | string;
}

export function CustomerSearchModal({
  visible,
  onClose,
  customers,
  onSelect,
  selectedId,
}: CustomerSearchModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    return customers.filter(c =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        onPress={() => {
          onSelect(item);
          onClose();
        }}
        className={`p-4 border-b border-border flex-row items-center justify-between ${isSelected ? 'bg-primary/5' : 'active:bg-secondary/30'}`}
      >
        <View className="flex-row items-center flex-1">
          <View className="flex-1">
            <Text className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
              {item.name}
            </Text>
            {item.address && (
              <Text className="text-xs text-muted-foreground line-clamp-1">
                {item.address}
              </Text>
            )}
          </View>
        </View>
        {isSelected && <Check size={20} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <Text className="text-lg font-bold text-foreground">
            {t('attendance.selectCustomer')}
          </Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="p-4">
          <View className="relative">
            <View className="absolute left-3 top-2.5 z-10">
              <Search size={18} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder={t('attendance.searchCustomerPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              className="h-10 pl-10 bg-secondary/30 border-0 rounded-xl"
            />
          </View>
        </View>

        <FlatList
          data={filteredCustomers}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={
            <View className="p-10 items-center">
              <Text className="text-muted-foreground">
                {t('attendance.noCustomersFound') || 'No customers found'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </SafeAreaView>
    </Modal>
  );
}
