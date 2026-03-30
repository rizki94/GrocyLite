import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import { useNavigation } from '@react-navigation/native';
import { useThemeColor } from '../../lib/colors';
import {
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Users,
  Map as MapIcon,
  DollarSign,
  Package,
  Weight as WeightIcon,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react-native';
import { DateRangePicker } from '../../components/ui/date-range-picker';
import { Card } from '../../components/ui/card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import { useTranslation } from 'react-i18next';

const StatCard = ({ label, value, subValue, icon: Icon, color }: any) => (
  <View
    className="p-3 rounded-xl border bg-card min-w-[140px]"
    style={{ borderColor: color + '40', backgroundColor: color + '08' }}
  >
    <View className="flex-row items-center justify-between mb-2">
      <View
        className="p-1.5 rounded-lg"
        style={{ backgroundColor: color + '15' }}
      >
        <Icon size={14} color={color} />
      </View>
    </View>
    <Text className="text-[10px] text-muted-foreground font-extrabold uppercase mb-1">
      {label}
    </Text>
    <Text className="text-base font-black text-foreground" numberOfLines={1}>
      {value}
    </Text>
    {subValue && (
      <Text className="text-[9px] font-bold mt-1" style={{ color: color }}>
        {subValue}
      </Text>
    )}
  </View>
);

export function ProfitScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const colors = useThemeColor();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [release, setRelease] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'salesman' | 'route'>('salesman');
  const [isChangingTab, setIsChangingTab] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [groups, setGroups] = useState<{ name: string; items: string[] }[]>([]);
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(
    null,
  );
  const [isGroupPromptVisible, setIsGroupPromptVisible] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(`profit_groups_${activeTab}`).then(res => {
      if (res) setGroups(JSON.parse(res));
      else setGroups([]);
    });
  }, [activeTab]);

  useEffect(() => {
    AsyncStorage.setItem(`profit_groups_${activeTab}`, JSON.stringify(groups));
  }, [groups, activeTab]);

  const getItemId = useCallback(
    (item: any, index: number) => {
      return item.Salesman || `${activeTab}-${index}`;
    },
    [activeTab],
  );

  const filters = useMemo(
    () => ({
      startDate: dateFormatted(startDate),
      endDate: dateFormatted(endDate),
      release: release,
    }),
    [startDate, endDate, release],
  );

  const {
    data: omzetData,
    isLoading: loadingOmzet,
    fetchError: errorOmzet,
  } = useFetchWithParams(
    'api/bridge/laba_rugi',
    { params: filters },
    filters,
    refreshing,
  );

  const {
    data: routeData,
    isLoading: loadingRoute,
    fetchError: errorRoute,
  } = useFetchWithParams(
    'api/bridge/laba_rugi_by_route',
    { params: filters },
    filters,
    refreshing,
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const omzets = useMemo(() => {
    return Array.isArray(omzetData)
      ? omzetData
      : Object.values(omzetData || {});
  }, [omzetData]);

  const routeOmzets = useMemo(() => {
    return Array.isArray(routeData)
      ? routeData
      : Object.values(routeData || {});
  }, [routeData]);

  const displayedData = useMemo(() => {
    return activeTab === 'salesman' ? omzets : routeOmzets;
  }, [activeTab, omzets, routeOmzets]);

  const summary = useMemo(() => {
    const data = omzets;
    const totalSales = data.reduce(
      (acc, curr) => acc + (Number(curr.Amount) || 0),
      0,
    );
    const totalProfit = data.reduce(
      (acc, curr) => acc + (Number(curr.Profit) || 0),
      0,
    );
    const totalHPP = data.reduce(
      (acc, curr) => acc + (Number(curr.HPP) || 0),
      0,
    );
    const totalWeight = data.reduce(
      (acc, curr) => acc + (Number(curr.Weight) || 0),
      0,
    );
    const totalVolume = data.reduce(
      (acc, curr) => acc + (Number(curr.Volume) || 0),
      0,
    );
    const margin = totalHPP > 0 ? (totalProfit / totalHPP) * 100 : 0;
    return { totalSales, totalProfit, margin, totalWeight, totalVolume };
  }, [omzets]);

  const selectedSummary = useMemo(() => {
    const selectedData = displayedData.filter((item, idx) =>
      selectedIds.includes(getItemId(item, idx)),
    );
    const amount = selectedData.reduce(
      (acc, curr) => acc + (Number(curr.Amount) || 0),
      0,
    );
    const profit = selectedData.reduce(
      (acc, curr) => acc + (Number(curr.Profit) || 0),
      0,
    );
    const weight = selectedData.reduce(
      (acc, curr) => acc + (Number(curr.Weight) || 0),
      0,
    );
    const volume = selectedData.reduce(
      (acc, curr) => acc + (Number(curr.Volume) || 0),
      0,
    );
    return { amount, profit, weight, volume, count: selectedData.length };
  }, [selectedIds, displayedData, activeTab]);

  const handleTabChange = (tab: 'salesman' | 'route') => {
    if (tab === activeTab) return;
    setIsChangingTab(true);
    setActiveTab(tab);
    setSelectedIds([]);
    setEditingGroupIndex(null);
    setTimeout(() => setIsChangingTab(false), 500);
  };

  const selectAll = () => {
    if (selectedIds.length === displayedData.length) setSelectedIds([]);
    else setSelectedIds(displayedData.map((item, idx) => getItemId(item, idx)));
  };

  const alreadyGroupedItems = useMemo(() => {
    return groups.reduce((acc, group, index) => {
      if (index !== editingGroupIndex) {
        group.items.forEach(i => acc.add(i));
      }
      return acc;
    }, new Set<string>());
  }, [groups, editingGroupIndex]);

  const groupSummaries = useMemo(() => {
    return groups.map(group => {
      const summary = {
        name: group.name,
        Amount: 0,
        Weight: 0,
        Volume: 0,
        Count: 0,
        HPP: 0,
        Profit: 0,
        Margin: 0,
        items: group.items,
      };

      group.items.forEach(itemId => {
        const itemData = displayedData.find(
          (r: any, idx: number) => getItemId(r, idx) === itemId,
        );
        if (itemData) {
          summary.Amount += Number(itemData.Amount || 0);
          summary.Weight += Number(itemData.Weight || 0);
          summary.Volume += Number(itemData.Volume || 0);
          summary.Count += Number(itemData.Count || 0);
          summary.HPP += Number(itemData.HPP || 0);
          summary.Profit += Number(itemData.Profit || 0);
        }
      });
      summary.Margin = summary.HPP ? (summary.Profit / summary.HPP) * 100 : 0;
      return summary;
    });
  }, [groups, displayedData, getItemId]);

  const toggleSelection = (id: string) => {
    if (alreadyGroupedItems.has(id)) return;
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const handleCreateGroup = () => {
    if (selectedIds.length === 0) return;
    setGroupNameInput(selectedIds[0] || 'Group 1');
    setIsGroupPromptVisible(true);
  };

  const submitGroup = () => {
    if (editingGroupIndex !== null) {
      setGroups(prev => {
        const next = [...prev];
        next[editingGroupIndex] = { name: groupNameInput, items: selectedIds };
        return next;
      });
      setEditingGroupIndex(null);
    } else {
      setGroups(prev => [
        ...prev,
        { name: groupNameInput, items: selectedIds },
      ]);
    }
    setSelectedIds([]);
    setIsGroupPromptVisible(false);
  };

  const handleEditGroup = (index: number) => {
    setEditingGroupIndex(index);
    setSelectedIds(groups[index].items);
  };

  const handleCancelEdit = () => {
    setEditingGroupIndex(null);
    setSelectedIds([]);
  };

  const handleDeleteGroup = (index: number) => {
    Alert.alert(
      t('general.delete') || 'Delete',
      t('dialog.deleteMessage') || 'Are you sure?',
      [
        { text: t('general.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('general.confirm') || 'Confirm',
          style: 'destructive',
          onPress: () => {
            setGroups(prev => prev.filter((_, i) => i !== index));
            if (editingGroupIndex === index) {
              setEditingGroupIndex(null);
              setSelectedIds([]);
            }
          },
        },
      ],
    );
  };

  const insets = useSafeAreaInsets();

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
              {t('sales.profitLoss')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="mb-3">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row bg-secondary p-0.5 rounded-lg">
              <TouchableOpacity
                onPress={() => handleTabChange('salesman')}
                style={[
                  styles.tabButton,
                  activeTab === 'salesman' && { backgroundColor: colors.card },
                ]}
              >
                <Users
                  size={12}
                  color={
                    activeTab === 'salesman'
                      ? colors.primary
                      : colors.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'salesman' && { color: colors.primary },
                  ]}
                >
                  {t('element.salesman')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTabChange('route')}
                style={[
                  styles.tabButton,
                  activeTab === 'route' && { backgroundColor: colors.card },
                ]}
              >
                <MapIcon
                  size={12}
                  color={
                    activeTab === 'route'
                      ? colors.primary
                      : colors.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'route' && { color: colors.primary },
                  ]}
                >
                  {t('sales.route')}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center bg-secondary px-3 py-1.5 rounded-lg">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase mr-2.5">
                {t('sales.released')}
              </Text>
              <Switch
                value={release}
                onValueChange={setRelease}
                thumbColor={release ? colors.primary : '#f4f3f4'}
                trackColor={{ false: '#767577', true: colors.primary + '80' }}
                style={{ transform: [{ scale: 0.8 }] }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Pinned Cards for Groups */}
      {groupSummaries.length > 0 && (
        <View className="bg-card border-b border-border shadow-sm z-10 pt-3 pb-4">
          <View className="flex-row justify-between items-center mb-3 px-4">
            <Text className="text-xs font-bold text-muted-foreground uppercase">
              {t('sales.groupsLabel')}
              {editingGroupIndex !== null && (
                <Text className="text-primary italic"> ({t('sales.editing')})</Text>
              )}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          >
            {groupSummaries.map((summary, index) => {
              const isEditing = editingGroupIndex === index;
              return (
                <Card
                  key={index}
                  className={cn(
                    'p-3 w-64 border',
                    isEditing ? 'border-primary shadow-md' : 'border-border',
                  )}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="font-bold text-primary truncate">
                        {summary.name}
                      </Text>
                      <Text className="text-[10px] text-muted-foreground text-wrap">
                        {summary.items.join(', ')}
                      </Text>
                    </View>
                    <View className="flex-row gap-2 ml-2">
                      <TouchableOpacity
                        onPress={() => handleEditGroup(index)}
                        className="p-1.5 rounded-md bg-primary/10"
                      >
                        <Edit2 size={12} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteGroup(index)}
                        className="p-1.5 rounded-md bg-destructive/10"
                      >
                        <Trash2 size={12} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row bg-secondary/10 rounded-lg gap-2">
                    <View className="flex-1">
                      <Text className="text-[9px] uppercase text-muted-foreground font-bold">
                        {t('sales.amtPrf')}
                      </Text>
                      <Text className="text-xs text-secondary-foreground font-bold">
                        {numberWithComma(summary.Amount, 0)}
                      </Text>
                      <Text className="text-xs font-bold text-green-600">
                        {numberWithComma(summary.Profit, 0)}
                      </Text>
                    </View>
                    <View className="w-[1px] bg-border/50" />
                    <View className="flex-1 items-end">
                      <Text className="text-[9px] uppercase text-muted-foreground font-bold">
                        {t('sales.wtVol')}
                      </Text>
                      <Text className="text-xs text-secondary-foreground font-bold">
                        {numberWithComma(summary.Weight, 0)}
                      </Text>
                      <Text className="text-xs text-secondary-foreground font-bold">
                        {numberWithComma(summary.Volume, 0)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView className="flex-1">
        {errorOmzet && omzets.length === 0 ? (
          <ConnectionError
            onRetry={onRefresh}
            message={errorOmzet || undefined}
          />
        ) : (
          <>
            <View className="p-4">
              <Text className="text-sm font-bold text-muted-foreground uppercase mb-3">
                {t('sales.overallPerformance')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                <StatCard
                  label={t('approve.salesApprove.totalSales')}
                  value={numberWithComma(summary.totalSales)}
                  icon={DollarSign}
                  color={colors.primary}
                />
                <StatCard
                  label={t('sales.grossProfit')}
                  value={numberWithComma(summary.totalProfit)}
                  subValue={`${summary.margin.toFixed(1)}%`}
                  icon={TrendingUp}
                  color={colors.green}
                />
                <StatCard
                  label={t('element.weight')}
                  value={numberWithComma(summary.totalWeight, 2)}
                  icon={WeightIcon}
                  color={colors.indigo}
                />
                <StatCard
                  label={t('element.volume')}
                  value={numberWithComma(summary.totalVolume, 2)}
                  icon={Package}
                  color={colors.amber}
                />
              </ScrollView>
            </View>

            <View className="p-4 border-t border-border/30">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm font-bold text-muted-foreground uppercase">
                  {t('sales.breakdownDetails')}
                </Text>
                <TouchableOpacity
                  onPress={selectAll}
                  className="flex-row items-center bg-secondary/10 px-3 py-1.5 rounded-lg border border-border/50"
                >
                  <Text className="text-[10px] font-bold text-primary uppercase mr-2">
                    {selectedIds.length === displayedData.length
                      ? t('general.deselectAll')
                      : t('general.selectAll')}
                  </Text>
                  {selectedIds.length === displayedData.length ? (
                    <CheckSquare size={14} color={colors.primary} />
                  ) : (
                    <Square size={14} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>

              {displayedData.map((item: any, index: number) => {
                const profit = Number(item.Profit || 0);
                const margin =
                  Number(item.HPP) > 0 ? (profit / Number(item.HPP)) * 100 : 0;
                const itemId = getItemId(item, index);
                const isSelected = selectedIds.includes(itemId);
                const isAlreadyGrouped = alreadyGroupedItems.has(itemId);
                return (
                  <Card
                    key={itemId}
                    className={cn(
                      'mb-4 overflow-hidden border bg-card relative opacity-100',
                      isSelected ? 'border-primary/50' : 'border-border',
                      isAlreadyGrouped && 'opacity-50',
                    )}
                  >
                    <TouchableOpacity
                      activeOpacity={isAlreadyGrouped ? 1 : 0.7}
                      onPress={() => toggleSelection(itemId)}
                      className="p-4"
                    >
                      <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-1 flex-row items-center">
                          <View className="mr-3">
                            {isSelected ? (
                              <View className="bg-primary p-0.5 rounded">
                                <CheckSquare size={18} color="#fff" />
                              </View>
                            ) : (
                              <Square
                                size={18}
                                color={colors.mutedForeground}
                              />
                            )}
                          </View>
                          <View>
                            <Text className="text-base font-extrabold text-foreground uppercase">
                              {item.Salesman || 'Unknown'}
                            </Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                              {item.Count || 0} Outlets
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-lg font-black text-primary">
                            {numberWithComma(item.Amount)}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row bg-secondary/10 rounded-xl p-3">
                        <View className="flex-1">
                          <Text className="text-[9px] text-muted-foreground uppercase font-extrabold mb-1">
                            Profit
                          </Text>
                          <Text
                            className="text-xs font-bold"
                            style={{
                              color:
                                profit >= 0 ? colors.green : colors.destructive,
                            }}
                          >
                            {numberWithComma(profit)}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground mt-0.5">
                            {margin.toFixed(1)}%
                          </Text>
                        </View>
                        <View className="w-[1px] bg-border/50 mx-2" />
                        <View className="flex-1 items-center">
                          <Text className="text-[9px] text-muted-foreground uppercase font-extrabold mb-1">
                            Weight
                          </Text>
                          <Text className="text-xs font-bold text-foreground">
                            {numberWithComma(item.Weight, 2)}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                            KG
                          </Text>
                        </View>
                        <View className="w-[1px] bg-border/50 mx-2" />
                        <View className="flex-1 items-end">
                          <Text className="text-[9px] text-muted-foreground uppercase font-extrabold mb-1">
                            Volume
                          </Text>
                          <Text className="text-xs font-bold text-foreground">
                            {numberWithComma(item.Volume, 2)}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                            M³
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </View>
          </>
        )}
        <View className="h-20" />
      </ScrollView>

      {selectedIds.length > 0 && (
        <View
          className="bg-card border-t border-border pt-4 px-4 shadow-xl"
          style={{
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 10,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-black text-primary uppercase">
              {selectedIds.length} {t('general.selected')}
            </Text>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={() => setSelectedIds([])}>
                <Text className="text-[10px] font-bold text-muted-foreground uppercase">
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row gap-2 mb-3">
            {editingGroupIndex !== null ? (
              <>
                <TouchableOpacity
                  className="flex-1 bg-primary py-2 rounded-xl items-center flex-row justify-center"
                  onPress={setIsGroupPromptVisible.bind(null, true)}
                >
                  <Text className="text-xs font-bold text-white uppercase">
                    {t('sales.updateGroup')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-destructive/10 border border-destructive/20 py-2 rounded-xl items-center flex-row justify-center"
                  onPress={handleCancelEdit}
                >
                  <Text className="text-xs font-bold text-destructive uppercase">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleCreateGroup}
                className="flex-1 bg-primary/10 border border-primary/20 py-2 rounded-xl items-center flex-row justify-center"
              >
                <Plus size={14} color={colors.primary} />
                <Text className="ml-1 text-xs font-bold text-primary uppercase">
                  {t('sales.groupSelected')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1 bg-primary/5 p-2 rounded-xl items-center border border-primary/30">
              <Text className="text-[8px] font-extrabold text-primary uppercase mb-1">
                {t('approve.salesApprove.totalSales')}
              </Text>
              <Text className="text-xs font-bold text-primary">
                {numberWithComma(selectedSummary.amount)}
              </Text>
            </View>
            <View className="flex-1 bg-green-500/5 p-2 rounded-xl items-center border border-green-500/30">
              <Text className="text-[8px] font-extrabold text-green-600 uppercase mb-1">
                {t('sales.grossProfit')}
              </Text>
              <Text className="text-xs font-bold text-green-600">
                {numberWithComma(selectedSummary.profit)}
              </Text>
            </View>
            <View className="flex-1 bg-indigo-500/5 p-2 rounded-xl items-center border border-indigo-500/30">
              <Text className="text-[8px] font-extrabold text-indigo-600 uppercase mb-1">
                {t('element.weight')}
              </Text>
              <Text className="text-xs font-bold text-indigo-600">
                {numberWithComma(selectedSummary.weight, 1)}
              </Text>
            </View>
            <View className="flex-1 bg-amber-500/5 p-2 rounded-xl items-center border border-amber-500/30">
              <Text className="text-[8px] font-extrabold text-amber-600 uppercase mb-1">
                {t('element.volume')}
              </Text>
              <Text className="text-xs font-bold text-amber-600">
                {numberWithComma(selectedSummary.volume, 1)}
              </Text>
            </View>
          </View>
        </View>
      )}
      <Loading isLoading={loadingOmzet || loadingRoute || isChangingTab} />
      <Modal visible={isGroupPromptVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-card w-full max-w-sm rounded-2xl p-4">
            <Text className="text-lg font-bold mb-4 text-foreground">
              {editingGroupIndex !== null ? t('sales.updateGroup') : t('sales.createGroup')}
            </Text>
            <TextInput
              value={groupNameInput}
              onChangeText={setGroupNameInput}
              placeholder={t('sales.enterGroupName')}
              placeholderTextColor="#888"
              className="border border-border rounded-lg px-3 py-2 text-foreground mb-4"
              autoFocus
            />
            <View className="flex-row justify-end gap-2">
              <TouchableOpacity
                onPress={() => setIsGroupPromptVisible(false)}
                className="px-4 py-2 rounded-lg items-center bg-secondary/20"
              >
                <Text className="font-bold text-muted-foreground">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitGroup}
                className="px-4 py-2 rounded-lg items-center bg-primary"
              >
                <Text className="font-bold text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
});
