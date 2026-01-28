import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ToastAndroid,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFetch, useFetchWithParams } from '../../hooks/use-fetch';
import { useConnection } from '../../hooks/use-connection';
import { useTranslation } from 'react-i18next';
import { numberWithComma, dateFormatted } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import { ChevronDown, Search, ArrowLeft, RotateCcw } from 'lucide-react-native';
import { useThemeColor } from '../../lib/colors';
import { Input } from '../../components/ui/input';
import { DatePicker } from '../../components/ui/date-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Loading } from '../../components/ui/loading';

interface CancelTransactionItem {
  NoTr: string;
  CompanyName: string;
  NetAmount: number;
  opened?: boolean;
}

export function CancelTransactionScreen() {
  const { t } = useTranslation();
  const { apiClient } = useConnection();
  const colors = useThemeColor();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const [selectedGroupCode, setSelectedGroupCode] = useState('SJ');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupSelect, setShowGroupSelect] = useState(false);

  const { data: groupCodes } = useFetch('api/bridge/group_code');

  const {
    data: transactionData,
    isLoading,
    setData: setTransactionData,
  } = useFetchWithParams(
    'api/bridge/cancel_transaction',
    {
      params: {
        date: dateFormatted(date),
        groupcode: selectedGroupCode,
      },
    },
    { date, selectedGroupCode },
    refreshing,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleOpen = async (invoice: string) => {
    try {
      const response = await apiClient.post('api/bridge/open_invoice', {
        invoice,
      });
      if (response.data.status === 200) {
        ToastAndroid.show(
          t('cancelTransaction.openSuccess'),
          ToastAndroid.SHORT,
        );
        // Optimistic update
        if (Array.isArray(transactionData)) {
          const updated = transactionData.map((item: CancelTransactionItem) =>
            item.NoTr === invoice ? { ...item, opened: true } : item,
          );
          setTransactionData(updated);
        }
      } else {
        ToastAndroid.show(
          t('cancelTransaction.openFailed'),
          ToastAndroid.SHORT,
        );
      }
    } catch (e: any) {
      ToastAndroid.show(e.message || 'Error', ToastAndroid.SHORT);
    }
  };

  const filteredData = Array.isArray(transactionData)
    ? transactionData.filter(
        (item: CancelTransactionItem) =>
          item.CompanyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.NoTr.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const renderItem = ({ item }: { item: CancelTransactionItem }) => (
    <View className="mb-3 mx-4 flex-row items-center justify-between p-4 rounded-2xl border border-border/60 bg-card shadow-sm">
      <View className="flex-1 mr-4">
        <Text className="font-extrabold text-sm text-foreground mb-1">
          {item.NoTr}
        </Text>
        <Text className="text-xs font-medium text-muted-foreground uppercase mb-1">
          {item.CompanyName}
        </Text>
        <Text className="text-sm font-black text-primary">
          {numberWithComma(item.NetAmount)}
        </Text>
      </View>
      <View>
        {item.opened ? (
          <View className="bg-green-100 dark:bg-green-500/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-500/30">
            <Text className="font-bold text-xs" style={{ color: colors.green }}>
              {t('cancelTransaction.opened')}
            </Text>
          </View>
        ) : (
          <Pressable
            className="bg-primary/10 px-4 py-2.5 rounded-xl active:bg-primary/20 border border-primary/20"
            onPress={() => handleOpen(item.NoTr)}
          >
            <Text className="text-primary font-bold text-xs uppercase tracking-tight">
              {t('cancelTransaction.open')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const selectedGroup = Array.isArray(groupCodes)
    ? groupCodes.find((g: any) => g.GrpCode === selectedGroupCode)
    : null;

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
              {t('cancelTransaction.title')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <DatePicker value={date} onChange={setDate} />
            </View>
            <Pressable
              className="flex-row items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-background"
              onPress={() => setShowGroupSelect(true)}
            >
              <Text
                className="text-foreground text-xs font-bold uppercase tracking-tight"
                numberOfLines={1}
              >
                {selectedGroup ? selectedGroup.Descr : selectedGroupCode}
              </Text>
              <ChevronDown size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View className="relative">
            <View className="absolute left-3 top-2.5 z-10">
              <Search size={18} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder={t('cancelTransaction.searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="h-10 pl-10 bg-background border border-border rounded-xl font-bold text-xs"
            />
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1 pt-4"
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={item => item.NoTr}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                {t('cancelTransaction.noTransactions')}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Group Code Select Modal */}
      <Modal
        visible={showGroupSelect}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupSelect(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center px-6"
          onPress={() => setShowGroupSelect(false)}
        >
          <Pressable
            className="bg-card rounded-3xl max-h-[60%] overflow-hidden border border-border/30"
            onPress={e => e.stopPropagation()}
          >
            <View className="p-6 border-b border-border/10 bg-secondary/5">
              <Text className="text-lg font-black text-foreground uppercase tracking-tight">
                {t('cancelTransaction.selectGroup')}
              </Text>
            </View>
            <ScrollView>
              {Array.isArray(groupCodes) &&
                groupCodes.map((code: any) => (
                  <Pressable
                    key={code.GrpCode}
                    className={`p-5 border-b border-border/5 flex-row items-center justify-between ${
                      selectedGroupCode === code.GrpCode ? 'bg-primary/5' : ''
                    }`}
                    onPress={() => {
                      setSelectedGroupCode(code.GrpCode);
                      setShowGroupSelect(false);
                    }}
                  >
                    <Text
                      className={`text-sm font-bold uppercase tracking-tight ${
                        selectedGroupCode === code.GrpCode
                          ? 'text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {code.Descr}
                    </Text>
                    {selectedGroupCode === code.GrpCode && (
                      <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Pressable>
                ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <Loading isLoading={isLoading} />
    </View>
  );
}
