import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFetchWithParams, useFetch } from '../../hooks/use-fetch';
import { useConnection } from '../../hooks/use-connection';
import { useThemeColor } from '../../lib/colors';
import { numberWithComma, dateFormatted } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import {
  ArrowLeft,
  RotateCcw,
  Search,
  Filter,
  CheckSquare,
  Square,
  DollarSign,
  Calendar,
  Building2,
  X,
  CreditCard,
  AlertCircle,
  FileText,
  ChevronDown,
} from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Loading } from '../../components/ui/loading';
import { DatePicker } from '../../components/ui/date-picker';
import { ConnectionError } from '../../components/connection-error';

export interface UnpaidInvoice {
  NoTr: string;
  GrpCode: string;
  CodeTr: string;
  DateTr: string;
  DueDate: string;
  Contact: number;
  CustomerName: string;
  NoRef: string | null;
  Memo: string | null;
  NetAmount: string | number;
  ClearedAmount: string | number;
  Outstanding: string | number;
  IsOverdue: number;
  OverdueDays: number;
}

export function CreditPaymentsScreen() {
  const colors = useThemeColor();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { apiClient } = useConnection();

  const [source, setSource] = useState<'4PILAR' | 'PKP' | 'NON'>('4PILAR');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Selected invoices map: { [NoTr]: UnpaidInvoice }
  const [selectedMap, setSelectedMap] = useState<Record<string, UnpaidInvoice>>({});

  // Payment Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [accBank, setAccBank] = useState('');
  const [bankAccAct, setBankAccAct] = useState('');
  const [description, setDescription] = useState('KEBUTUHAN DAPUR __ SD __');
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selector Picker Modals
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);

  const fetchParams = useMemo(
    () => ({
      params: {
        source,
        per_page: 50,
        search: searchQuery || undefined,
        is_overdue: showOverdueOnly ? '1' : undefined,
      },
    }),
    [source, searchQuery, showOverdueOnly],
  );

  const {
    data: responseData,
    isLoading,
    fetchError,
    refetch,
  } = useFetchWithParams(
    'api/4pilar/pelunasan-piutang/unpaid',
    fetchParams,
    [source, searchQuery, showOverdueOnly],
    refreshing,
  );

  // Banks & Accounts
  const { data: mstBanks } = useFetch(`api/4pilar/mst-bank?source=${source}`, refreshing);
  const { data: bankAccounts } = useFetch(
    `api/4pilar/accounts?source=${source}&parent_lv4=1101.100,1101.200,2101.100`,
    refreshing,
  );

  // Default auto-select NISP and 2101.101
  useEffect(() => {
    if (Array.isArray(mstBanks) && mstBanks.length > 0 && !accBank) {
      const nisp = mstBanks.find((b: any) => {
        const code = (b.Bank || b.AccBank || '').toUpperCase();
        return code === 'NIS' || code.includes('NISP');
      });
      if (nisp) setAccBank(nisp.Bank || nisp.AccBank);
      else setAccBank(mstBanks[0].Bank || mstBanks[0].AccBank);
    }
  }, [mstBanks, accBank]);

  useEffect(() => {
    if (Array.isArray(bankAccounts) && bankAccounts.length > 0 && !bankAccAct) {
      const kas = bankAccounts.find((a: any) => a.AccAct === '2101.101');
      if (kas) setBankAccAct(kas.AccAct);
      else setBankAccAct(bankAccounts[0].AccAct);
    }
  }, [bankAccounts, bankAccAct]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }, [refetch]);

  const invoices: UnpaidInvoice[] = useMemo(() => {
    return responseData?.data || [];
  }, [responseData]);

  const summary = useMemo(() => {
    return (
      responseData?.summary || {
        total_count: 0,
        total_outstanding: 0,
        total_overdue: 0,
      }
    );
  }, [responseData]);

  const selectedInvoices = useMemo(() => {
    return Object.values(selectedMap);
  }, [selectedMap]);

  // Toggle single item selection
  const toggleSelect = (inv: UnpaidInvoice) => {
    setSelectedMap(prev => {
      const next = { ...prev };
      if (next[inv.NoTr]) {
        delete next[inv.NoTr];
      } else {
        next[inv.NoTr] = inv;
      }
      return next;
    });
  };

  // Toggle select all on current page
  const toggleSelectAll = () => {
    if (selectedInvoices.length === invoices.length && invoices.length > 0) {
      setSelectedMap({});
    } else {
      const next: Record<string, UnpaidInvoice> = {};
      invoices.forEach(inv => {
        next[inv.NoTr] = inv;
      });
      setSelectedMap(next);
    }
  };

  // Total amount selected (Sales minus Returns)
  const totalSelectedNet = useMemo(() => {
    return selectedInvoices.reduce((acc, inv) => {
      const isRetur =
        inv.GrpCode === 'SR' ||
        inv.CodeTr?.endsWith('BSR') ||
        Number(inv.Outstanding) < 0;
      const raw = paymentAmounts[inv.NoTr] ?? Number(inv.Outstanding);
      const amount = isRetur
        ? -Math.abs(Number(raw) || 0)
        : Math.abs(Number(raw) || 0);
      return acc + amount;
    }, 0);
  }, [selectedInvoices, paymentAmounts]);

  // Open Payment Modal
  const openPaymentModal = () => {
    if (selectedInvoices.length === 0) {
      Alert.alert('Perhatian', 'Pilih minimal satu faktur atau retur untuk dilunasi.');
      return;
    }

    const initialAmounts: Record<string, number> = {};
    selectedInvoices.forEach(inv => {
      const isRetur =
        inv.GrpCode === 'SR' ||
        inv.CodeTr?.endsWith('BSR') ||
        Number(inv.Outstanding) < 0;
      const num = Number(inv.Outstanding) || 0;
      initialAmounts[inv.NoTr] = isRetur ? -Math.abs(num) : Math.abs(num);
    });
    setPaymentAmounts(initialAmounts);
    setPaymentDate(new Date());
    setPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async () => {
    if (!accBank || !bankAccAct) {
      Alert.alert('Perhatian', 'Silakan pilih Bank dan Perkiraan Kas/Bank terlebih dahulu.');
      return;
    }

    if (totalSelectedNet <= 0) {
      Alert.alert('Perhatian', 'Total pembayaran bersih harus lebih besar dari Rp 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        source,
        date: dateFormatted(paymentDate),
        acc_bank: accBank,
        bank_acc_act: bankAccAct,
        description: description.trim() || 'KEBUTUHAN DAPUR __ SD __',
        split_notes: false,
        invoices: selectedInvoices.map(inv => {
          const isRetur =
            inv.GrpCode === 'SR' ||
            inv.CodeTr?.endsWith('BSR') ||
            Number(inv.Outstanding) < 0;
          const raw = paymentAmounts[inv.NoTr] ?? Number(inv.Outstanding);
          const val = isRetur
            ? -Math.abs(Number(raw) || 0)
            : Math.abs(Number(raw) || 0);
          return {
            no_tr: inv.NoTr,
            pay_amount: val,
          };
        }),
      };

      const res = await apiClient.post('api/4pilar/pelunasan-piutang/pay', payload);
      Alert.alert('Sukses', res.data?.message || 'Pelunasan piutang berhasil dibuat.');
      setPaymentModalOpen(false);
      setSelectedMap({});
      onRefresh();
    } catch (e: any) {
      const msg = e.response?.data?.error || e.response?.data?.message || 'Gagal memproses pelunasan';
      Alert.alert('Gagal', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: UnpaidInvoice }) => {
    const isSelected = !!selectedMap[item.NoTr];
    const isRetur =
      item.GrpCode === 'SR' ||
      item.CodeTr?.endsWith('BSR') ||
      Number(item.Outstanding) < 0;
    const isOverdue = !!item.IsOverdue;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggleSelect(item)}
      >
        <Card
          className={cn(
            'mb-3 mx-4 p-4 border rounded-2xl shadow-sm transition-all',
            isSelected
              ? 'border-primary bg-primary/5'
              : isRetur
                ? 'border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10'
                : 'border-border/60 bg-card',
          )}
        >
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-row items-center gap-2 flex-1 mr-2">
              <TouchableOpacity onPress={() => toggleSelect(item)} className="p-1 -ml-1">
                {isSelected ? (
                  <CheckSquare size={20} color={colors.primary} />
                ) : (
                  <Square size={20} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>

              <View className="flex-row items-center gap-1.5 flex-wrap">
                {isRetur ? (
                  <View className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40">
                    <Text className="text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase">
                      RETUR JUAL
                    </Text>
                  </View>
                ) : (
                  <View className="px-2 py-0.5 rounded-md bg-secondary/30">
                    <Text className="text-[10px] font-bold text-foreground font-mono">
                      {item.CodeTr}
                    </Text>
                  </View>
                )}
                <Text className="font-mono font-bold text-xs text-foreground tracking-tight">
                  {item.NoTr}
                </Text>
              </View>
            </View>

            {isRetur ? (
              <View className="px-2 py-0.5 rounded-full bg-purple-500/15">
                <Text className="text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase">
                  Retur
                </Text>
              </View>
            ) : isOverdue ? (
              <View className="px-2 py-0.5 rounded-full bg-destructive/15">
                <Text className="text-[10px] font-black text-destructive uppercase">
                  Lewat {item.OverdueDays}h
                </Text>
              </View>
            ) : (
              <View className="px-2 py-0.5 rounded-full bg-amber-500/15">
                <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                  Belum Lunas
                </Text>
              </View>
            )}
          </View>

          {/* Customer Name */}
          <Text className="text-sm font-black text-foreground mb-1 uppercase tracking-tight">
            {item.CustomerName}
          </Text>
          {item.NoRef && (
            <Text className="text-[10px] font-mono text-muted-foreground mb-3 opacity-70">
              Reff: {item.NoRef}
            </Text>
          )}

          {/* Amount Details */}
          <View className="flex-row justify-between items-center pt-2.5 border-t border-border/20">
            <View>
              <Text className="text-[10px] text-muted-foreground font-semibold">Tgl Faktur</Text>
              <Text className="text-xs font-medium text-foreground">{item.DateTr?.slice(0, 10)}</Text>
            </View>

            <View className="items-end">
              <Text className="text-[10px] text-muted-foreground font-semibold">
                {isRetur ? 'Nilai Retur (Pengurang)' : 'Sisa Tagihan'}
              </Text>
              <Text
                className={cn(
                  'text-sm font-black tabular-nums',
                  isRetur
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-primary',
                )}
              >
                {Number(item.Outstanding) < 0 ? '-' : ''}Rp {numberWithComma(Math.abs(Number(item.Outstanding)))}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
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
      {/* Header */}
      <View className="bg-card border-b border-border shadow-sm">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full">
              <ArrowLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <View className="ml-2">
              <Text className="text-xl font-black text-foreground">Pelunasan Piutang</Text>
              <Text className="text-[10px] text-muted-foreground font-medium">
                Settle piutang penjualan & retur pelanggan
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 bg-secondary/20 rounded-full">
            <RotateCcw size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Search & Overdue Filter */}
        <View className="px-4 pb-3 flex-row gap-2">
          <View className="flex-1">
            <Input
              placeholder="Cari pelanggan / no faktur..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-secondary/15 h-10 border-border/50 rounded-xl font-bold text-xs pl-10"
              leftIcon={<Search size={16} color={colors.mutedForeground} />}
            />
          </View>

          <Pressable
            className={cn(
              'flex-row items-center px-3 h-10 rounded-xl border',
              showOverdueOnly
                ? 'bg-destructive/15 border-destructive'
                : 'bg-secondary/20 border-border/50',
            )}
            onPress={() => setShowOverdueOnly(!showOverdueOnly)}
          >
            <Filter
              size={14}
              color={showOverdueOnly ? colors.destructive : colors.mutedForeground}
              style={{ marginRight: 4 }}
            />
            <Text
              className={cn(
                'text-[10px] font-black uppercase',
                showOverdueOnly ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              Jatuh Tempo
            </Text>
          </Pressable>
        </View>

        {/* Summary Card */}
        <View className="px-4 pb-3">
          <View className="p-4 rounded-2xl bg-primary border border-primary/20 shadow-md flex-row justify-between items-center">
            <View>
              <Text className="text-primary-foreground text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">
                Total Piutang Belum Lunas
              </Text>
              <Text className="font-black text-2xl text-white">
                Rp {numberWithComma(summary.total_outstanding)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-primary-foreground text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">
                Jatuh Tempo
              </Text>
              <Text className="font-bold text-sm text-red-200">
                Rp {numberWithComma(summary.total_overdue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Selection Bar Header */}
        {invoices.length > 0 && (
          <View className="px-4 py-2 bg-secondary/10 flex-row justify-between items-center border-t border-border/30">
            <TouchableOpacity onPress={toggleSelectAll} className="flex-row items-center gap-2">
              {selectedInvoices.length === invoices.length ? (
                <CheckSquare size={16} color={colors.primary} />
              ) : (
                <Square size={16} color={colors.mutedForeground} />
              )}
              <Text className="text-xs font-bold text-foreground">
                Pilih Semua ({selectedInvoices.length}/{invoices.length})
              </Text>
            </TouchableOpacity>

            {selectedInvoices.length > 0 && (
              <Text className="text-xs font-black text-primary">
                Net: Rp {numberWithComma(totalSelectedNet)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Invoice List */}
      <FlatList
        className="flex-1 pt-3"
        data={invoices}
        keyExtractor={item => item.NoTr}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (selectedInvoices.length > 0 ? 80 : 20),
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          fetchError ? (
            <ConnectionError onRetry={onRefresh} message={fetchError} />
          ) : !isLoading ? (
            <View className="flex-1 items-center justify-center pt-24 px-6">
              <CreditCard size={42} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 12 }} />
              <Text className="text-center font-bold text-foreground text-sm mb-1">
                Tidak ada piutang belum lunas
              </Text>
              <Text className="text-center text-muted-foreground text-xs">
                Semua faktur dan retur penjualan telah lunas.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Floating Bottom Action Bar */}
      {selectedInvoices.length > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-2xl flex-row items-center justify-between gap-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex-1">
            <Text className="text-[10px] text-muted-foreground font-bold uppercase">
              {selectedInvoices.length} Faktur/Retur Dipilih
            </Text>
            <Text className="text-lg font-black text-foreground">
              Rp {numberWithComma(totalSelectedNet)}
            </Text>
          </View>

          <Button
            className="h-12 px-6 bg-primary rounded-xl"
            onPress={openPaymentModal}
          >
            <DollarSign size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text className="text-sm font-black text-white">Proses Bayar</Text>
          </Button>
        </View>
      )}

      <Loading isLoading={isLoading || isSubmitting} />

      {/* Payment Settlement Modal */}
      <Modal
        visible={paymentModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View
            className="bg-card w-full rounded-t-3xl border-t border-border p-5 shadow-2xl max-h-[85%]"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-border/40">
              <View className="flex-row items-center gap-2">
                <CreditCard size={20} color={colors.primary} />
                <Text className="text-base font-black text-foreground">Konfirmasi Pelunasan</Text>
              </View>
              <TouchableOpacity onPress={() => setPaymentModalOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Payment Date */}
              <View className="mb-3">
                <Text className="text-xs font-bold text-foreground mb-1">
                  Tanggal Pelunasan <Text className="text-destructive">*</Text>
                </Text>
                <DatePicker
                  value={paymentDate}
                  onChange={(d: Date) => setPaymentDate(d || new Date())}
                  className="h-11 text-xs"
                />
              </View>

              {/* Bank Selector */}
              <View className="mb-3">
                <Text className="text-xs font-bold text-foreground mb-1">
                  Bank (MstBank) <Text className="text-destructive">*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setBankPickerOpen(true)}
                  className="h-11 px-3 bg-secondary/15 rounded-xl border border-border/50 flex-row items-center justify-between"
                >
                  <Text className="text-xs font-bold text-foreground">
                    {accBank
                      ? `${accBank} - ${(mstBanks || []).find((b: any) => (b.Bank || b.AccBank) === accBank)?.Descr || ''}`
                      : 'Pilih Bank...'}
                  </Text>
                  <ChevronDown size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Account Selector */}
              <View className="mb-3">
                <Text className="text-xs font-bold text-foreground mb-1">
                  Perkiraan Kas/Bank (AccAct) <Text className="text-destructive">*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setAccountPickerOpen(true)}
                  className="h-11 px-3 bg-secondary/15 rounded-xl border border-border/50 flex-row items-center justify-between"
                >
                  <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                    {bankAccAct
                      ? `${bankAccAct} - ${(bankAccounts || []).find((a: any) => a.AccAct === bankAccAct)?.Descr || ''}`
                      : 'Pilih Perkiraan...'}
                  </Text>
                  <ChevronDown size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Keterangan */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-foreground mb-1">Keterangan Header</Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Keterangan pelunasan..."
                  className="h-10 text-xs font-medium bg-secondary/15"
                />
              </View>

              {/* Invoices Breakdown Table */}
              <Text className="text-xs font-bold text-foreground mb-2">
                Rincian Tagihan & Retur ({selectedInvoices.length}):
              </Text>
              <View className="rounded-xl border border-border/40 overflow-hidden mb-4">
                {selectedInvoices.map((inv, idx) => {
                  const isRetur =
                    inv.GrpCode === 'SR' ||
                    inv.CodeTr?.endsWith('BSR') ||
                    Number(inv.Outstanding) < 0;

                  return (
                    <View
                      key={inv.NoTr}
                      className={cn(
                        'p-3 flex-row justify-between items-center',
                        idx > 0 && 'border-t border-border/20',
                        isRetur ? 'bg-purple-50/25 dark:bg-purple-950/20' : 'bg-card',
                      )}
                    >
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-1.5 mb-0.5">
                          {isRetur && (
                            <View className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40">
                              <Text className="text-[9px] font-black text-purple-700 dark:text-purple-300">
                                RETUR
                              </Text>
                            </View>
                          )}
                          <Text className="font-mono font-bold text-xs text-foreground">
                            {inv.NoTr}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-muted-foreground truncate">
                          {inv.CustomerName}
                        </Text>
                      </View>

                      <View className="items-end w-32">
                        <Input
                          keyboardType="numeric"
                          value={paymentAmounts[inv.NoTr]?.toString() ?? ''}
                          onChangeText={txt => {
                            const val = parseFloat(txt) || 0;
                            setPaymentAmounts(prev => ({
                              ...prev,
                              [inv.NoTr]: isRetur ? -Math.abs(val) : Math.abs(val),
                            }));
                          }}
                          className={cn(
                            'h-8 text-xs text-right font-bold tabular-nums',
                            isRetur && 'text-purple-600 dark:text-purple-400 border-purple-300',
                          )}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Total Net Settlement */}
              <View className="p-4 rounded-2xl bg-primary/10 border border-primary/20 mb-4 flex-row justify-between items-center">
                <Text className="text-xs font-black text-foreground">Total Bayar Bersih:</Text>
                <Text className="text-xl font-black text-primary">
                  Rp {numberWithComma(totalSelectedNet)}
                </Text>
              </View>

              {/* Submit Buttons */}
              <View className="flex-row gap-2 mt-1">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onPress={() => setPaymentModalOpen(false)}
                  disabled={isSubmitting}
                >
                  <Text className="text-xs font-bold text-foreground">Batal</Text>
                </Button>
                <Button
                  className="flex-1 h-12 bg-primary"
                  onPress={handleSubmitPayment}
                  disabled={isSubmitting || totalSelectedNet <= 0}
                >
                  <Text className="text-xs font-bold text-white">Konfirmasi & Lunasi</Text>
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bank Picker Modal */}
      <Modal
        visible={bankPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBankPickerOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 shadow-2xl max-h-[70%]">
            <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-border/30">
              <Text className="text-sm font-black text-foreground">Pilih Bank</Text>
              <TouchableOpacity onPress={() => setBankPickerOpen(false)}>
                <X size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(mstBanks || []).map((b: any) => {
                const code = b.Bank || b.AccBank;
                const isSelected = accBank === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => {
                      setAccBank(code);
                      setBankPickerOpen(false);
                    }}
                    className={cn(
                      'p-3 rounded-xl mb-1.5 flex-row justify-between items-center',
                      isSelected ? 'bg-primary/15' : 'bg-secondary/10',
                    )}
                  >
                    <Text className="text-xs font-bold text-foreground">
                      {code} - {b.Descr}
                    </Text>
                    {isSelected && <CheckSquare size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Account Picker Modal */}
      <Modal
        visible={accountPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountPickerOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 shadow-2xl max-h-[70%]">
            <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-border/30">
              <Text className="text-sm font-black text-foreground">Pilih Perkiraan Kas/Bank</Text>
              <TouchableOpacity onPress={() => setAccountPickerOpen(false)}>
                <X size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(bankAccounts || []).map((a: any) => {
                const code = a.AccAct;
                const isSelected = bankAccAct === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => {
                      setBankAccAct(code);
                      setAccountPickerOpen(false);
                    }}
                    className={cn(
                      'p-3 rounded-xl mb-1.5 flex-row justify-between items-center',
                      isSelected ? 'bg-primary/15' : 'bg-secondary/10',
                    )}
                  >
                    <Text className="text-xs font-bold text-foreground flex-1 mr-2" numberOfLines={1}>
                      {code} - {a.Descr}
                    </Text>
                    {isSelected && <CheckSquare size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
