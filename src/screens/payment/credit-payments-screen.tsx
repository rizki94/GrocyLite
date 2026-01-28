import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Card } from '../../components/ui/card';
import { useFetch } from '../../hooks/use-fetch';
import { numberWithComma } from '../../utils/helpers';
import { Search, Filter, ArrowLeft, RotateCcw } from 'lucide-react-native';
import { Input } from '../../components/ui/input';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '../../lib/colors';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export function CreditPaymentsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [showOverdueOnly, setShowOverdueOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: creditPayments,
    isLoading,
    fetchError,
  } = useFetch('api/bridge/credit_payment', refreshing);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredData = useMemo(() => {
    if (!Array.isArray(creditPayments)) return [];

    let result = creditPayments;
    const pattern = 'BSR';

    if (showOverdueOnly) {
      result = result.filter(item => {
        const isOverdue =
          new Date().setHours(0, 0, 0, 0) > new Date(item.DueDate).getTime();
        const isExcluded =
          item.CompanyName === 'AKI GUDANG' ||
          item.CompanyName === 'GUDANG PAGARSIH' ||
          item.CompanyName === 'AKI GUDANG KILOAN' ||
          (item.NoTr || '').indexOf(pattern) !== -1;

        return isOverdue && !isExcluded;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toUpperCase();
      result = result.filter(item =>
        (item.CompanyName || '').toUpperCase().includes(q),
      );
    }

    return result;
  }, [creditPayments, showOverdueOnly, searchQuery]);

  const totalBalance = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => acc + Number(item.balance || 0),
      0,
    );
  }, [filteredData]);

  const renderItem = ({ item }: { item: any }) => {
    const isOverdue =
      new Date().setHours(0, 0, 0, 0) > new Date(item.DueDate).getTime();

    return (
      <Card className="mb-3 mx-4 p-4 border border-border/50 shadow-sm">
        <View className="flex-row justify-between mb-3">
          <Text className="font-extrabold text-sm text-foreground flex-1 pr-2 uppercase">
            {item.CompanyName}
          </Text>
          <View
            className={`px-2 py-1 rounded-lg ${item.balance > 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}
          >
            <Text
              className={`text-[10px] font-black ${item.balance > 0 ? 'text-destructive' : 'text-green-500'}`}
            >
              AR: {numberWithComma(item.balance)}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center pt-3 border-t border-border/10">
          <Text className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
            {item.NoTr}
          </Text>
          <View className="flex-row gap-4">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase">
              TOP: {item.TermTOP}
            </Text>
            <Text
              className={`text-[10px] font-black uppercase ${isOverdue ? 'text-destructive' : 'text-green-500'}`}
            >
              {item.DateDiff} {t('element.days')}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

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
              {t('finance.accountReceivableReport')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Input
                placeholder={t('general.search')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="bg-secondary/10 h-10 border-border/50 rounded-xl font-bold text-xs pl-10"
                leftIcon={<Search size={16} color={colors.mutedForeground} />}
              />
            </View>
            <Pressable
              className={`flex-row items-center px-4 h-10 rounded-xl border ${showOverdueOnly ? 'bg-destructive/10 border-destructive' : 'bg-green-500/10 border-green-500'}`}
              onPress={() => setShowOverdueOnly(!showOverdueOnly)}
            >
              <Filter
                size={14}
                color={showOverdueOnly ? colors.destructive : colors.green}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`text-[10px] font-black uppercase ${showOverdueOnly ? 'text-destructive' : 'text-green-500'}`}
              >
                {showOverdueOnly ? t('element.od') : t('general.all')}
              </Text>
            </Pressable>
          </View>

          <View className="p-6 rounded-2xl bg-primary border border-primary/20 shadow-lg items-center">
            <Text className="text-primary-foreground text-xs font-bold uppercase tracking-[2px] opacity-80 mb-2">
              {t('element.total')} (
              {showOverdueOnly ? t('element.od') : t('general.all')})
            </Text>
            <Text className="font-black text-4xl text-white">
              {numberWithComma(totalBalance)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1 pt-4"
        data={
          fetchError && (!creditPayments || creditPayments.length === 0)
            ? []
            : filteredData
        }
        keyExtractor={(item, index) => (item.NoTr || index).toString()}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={renderItem}
        ListEmptyComponent={
          fetchError && (!creditPayments || creditPayments.length === 0) ? (
            <ConnectionError onRetry={onRefresh} message={fetchError} />
          ) : !isLoading ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                {t('general.resultNotAvailable')}
              </Text>
            </View>
          ) : null
        }
      />
      <Loading isLoading={isLoading} />
    </View>
  );
}
