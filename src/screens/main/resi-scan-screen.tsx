import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import {
  ArrowLeft,
  RotateCcw,
  Search,
  ScanBarcode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flashlight,
  X,
  Check,
  Truck,
  PackageCheck,
  ChevronDown,
  Filter,
} from 'lucide-react-native';
import { useConnection } from '../../hooks/use-connection';
import { useThemeColor } from '../../lib/colors';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/input';
import { DatePicker } from '../../components/ui/date-picker';
import { playBeepSuccess, playBeepError } from '../../utils/beep-sound';

export interface MarketplaceTransactionItem {
  id: number | string;
  date: string;
  local_invoice: string;
  marketplace_invoice?: string;
  tracking_number?: string;
  courier_code?: string;
  courier_raw?: string;
  status?: string;
  tracking_status?: string;
  tracking_last_checked_at?: string;
  sudah_dicek?: boolean;
  checked_at?: string;
  marketplace?: {
    id: number;
    name: string;
  };
}

const COMMON_COURIERS = [
  { label: 'Semua Kurir', value: 'all' },
  { label: 'SPX (Shopee)', value: 'spx' },
  { label: 'J&T Express', value: 'jnt' },
  { label: 'JNE', value: 'jne' },
  { label: 'SiCepat', value: 'sicepat' },
  { label: 'Ninja Express', value: 'ninja' },
  { label: 'AnterAja', value: 'anteraja' },
  { label: 'ID Express', value: 'ide' },
  { label: 'Grab', value: 'grab' },
  { label: 'GoSend', value: 'gosend' },
];

export function ResiScanScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColor();
  const { apiClient } = useConnection();

  // Filters state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourier, setSelectedCourier] = useState<string>('all');
  const [checkStatusFilter, setCheckStatusFilter] = useState<'false' | 'true' | 'all'>('false');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Transactions data
  const [transactions, setTransactions] = useState<MarketplaceTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{
    text: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  // Warning Modal state for cancelled/no tracking
  const [warningData, setWarningData] = useState<{
    title: string;
    message: string;
    trackingNumber: string;
    invoice?: string;
    courier?: string;
    status?: string;
    trackingStatus?: string;
  } | null>(null);

  // Courier Picker Modal
  const [isCourierModalOpen, setIsCourierModalOpen] = useState<boolean>(false);

  // Scanner locks & cooldowns
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const isProcessingScanRef = useRef<boolean>(false);

  // Vision Camera hooks
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Request camera permission on mount if needed
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Fetch transactions from API
  const fetchTransactions = useCallback(
    async (isRefresh: boolean = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
        const params: Record<string, any> = {
          date: formattedDate,
          per_page: 500, // Load full daily batch for quick warehouse check
        };

        if (selectedCourier && selectedCourier !== 'all') {
          params.courier = selectedCourier;
        }

        if (checkStatusFilter !== 'all') {
          params.sudah_dicek = checkStatusFilter;
        }

        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }

        const response = await apiClient.get('online/bridge/transactions', { params });
        const list: MarketplaceTransactionItem[] = response.data?.data || [];
        setTransactions(list);
      } catch (error: any) {
        console.error('Error fetching marketplace transactions:', error);
        ToastAndroid.show('Gagal memuat data transaksi', ToastAndroid.SHORT);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiClient, selectedDate, selectedCourier, checkStatusFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle Mark Checked via API
  const handleMarkChecked = useCallback(
    async (codeToProcess: string, targetSudahDicek: boolean = true) => {
      try {
        const response = await apiClient.post('online/bridge/transactions/mark-checked', {
          tracking_number: codeToProcess,
          sudah_dicek: targetSudahDicek,
        });

        const resData = response.data;
        const updatedItem = resData?.data;

        // Update in local state
        setTransactions((prev) =>
          prev.map((item) => {
            if (
              item.tracking_number === codeToProcess ||
              item.marketplace_invoice === codeToProcess ||
              item.local_invoice === codeToProcess ||
              (updatedItem && item.id === updatedItem.id)
            ) {
              return {
                ...item,
                sudah_dicek: targetSudahDicek,
                checked_at: updatedItem?.checked_at || moment().format('YYYY-MM-DD HH:mm:ss'),
              };
            }
            return item;
          })
        );

        return resData;
      } catch (error: any) {
        console.error('Error mark checked:', error);
        throw error;
      }
    },
    [apiClient]
  );

  // Fast Barcode Scanner Processor
  const processScannedCode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      const now = Date.now();
      // Prevent duplicate scan within 2.5s of the same barcode
      if (lastScannedCodeRef.current === code && now - lastScannedTimeRef.current < 2500) {
        return;
      }

      lastScannedCodeRef.current = code;
      lastScannedTimeRef.current = now;
      isProcessingScanRef.current = true;

      try {
        const result = await handleMarkChecked(code, true);

        if (result?.is_warning) {
          // LOUD ERROR BUZZER & VIBRATION
          playBeepError();

          const itemData = result.data || {};
          setWarningData({
            title: 'PERINGATAN: JANGAN KIRIM PAKET!',
            message: result.warning_message || 'Status transaksi bermasalah atau belum terdaftar!',
            trackingNumber: itemData.tracking_number || code,
            invoice: itemData.marketplace_invoice || itemData.local_invoice,
            courier: itemData.courier_raw || itemData.courier_code,
            status: itemData.status,
            trackingStatus: itemData.tracking_status,
          });

          setLastScannedFeedback({
            text: `⚠️ [${code}] ${result.warning_type || 'WARNING'}`,
            type: 'warning',
          });
        } else {
          // LOUD SUCCESS BEEP
          playBeepSuccess();

          setLastScannedFeedback({
            text: `✅ ${code} SUDAH DICEK`,
            type: 'success',
          });

          // Ready for next scan immediately!
          setTimeout(() => {
            isProcessingScanRef.current = false;
          }, 350);
        }
      } catch (err: any) {
        playBeepError();
        const msg = err.response?.data?.message || `Resi '${code}' tidak ditemukan di sistem!`;

        setLastScannedFeedback({
          text: `❌ ${msg}`,
          type: 'error',
        });

        // Show brief alert or feedback
        ToastAndroid.show(msg, ToastAndroid.LONG);

        setTimeout(() => {
          isProcessingScanRef.current = false;
        }, 1200);
      }
    },
    [handleMarkChecked]
  );

  // Vision Camera Code Scanner Hook
  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr',
      'code-128',
      'code-39',
      'ean-13',
      'ean-8',
      'upc-a',
      'upc-e',
      'codabar',
      'itf',
    ],
    onCodeScanned: (codes) => {
      if (warningData) return; // Freeze scanner while warning modal is open
      if (isProcessingScanRef.current) return;

      const firstCode = codes[0]?.value;
      if (firstCode) {
        processScannedCode(firstCode);
      }
    },
  });

  // Calculate counters
  const totalCount = transactions.length;
  const checkedCount = useMemo(
    () => transactions.filter((t) => t.sudah_dicek).length,
    [transactions]
  );
  const uncheckedCount = totalCount - checkedCount;

  // Render Transaction Card Item
  const renderItem = ({ item }: { item: MarketplaceTransactionItem }) => {
    const isCancelled = ['cancelled', 'cancel', 'batal', 'returned', 'retur'].includes(
      (item.status || '').toLowerCase()
    );
    const trackingStatus = (item.tracking_status || '').toUpperCase();
    const isTrackingCancelled = ['CANCELLED', 'RETURNED', 'BATAL', 'RETUR'].includes(trackingStatus);
    const hasNoTracking = !trackingStatus || trackingStatus === 'PENDING' || trackingStatus === 'NOT_FOUND';

    return (
      <View
        className={cn(
          'mb-3 rounded-2xl border p-4 bg-card shadow-sm',
          isCancelled || isTrackingCancelled
            ? 'border-red-500/50 bg-red-500/5'
            : item.sudah_dicek
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-border'
        )}
      >
        <View className="flex-row items-center justify-between mb-2">
          {/* Courier & Marketplace Badge */}
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <View className="bg-primary/10 rounded-lg px-2.5 py-1 flex-row items-center">
              <Truck size={13} color={colors.primary} />
              <Text className="text-xs font-bold text-primary ml-1 uppercase">
                {item.courier_raw || item.courier_code || 'KURIR'}
              </Text>
            </View>

            {item.marketplace && (
              <View className="bg-secondary/40 rounded-lg px-2 py-1">
                <Text className="text-[11px] font-semibold text-foreground">
                  {item.marketplace.name}
                </Text>
              </View>
            )}
          </View>

          {/* Status Pengecekan Badge */}
          <TouchableOpacity
            onPress={() => handleMarkChecked(item.tracking_number || item.local_invoice, !item.sudah_dicek)}
            className={cn(
              'flex-row items-center px-2.5 py-1 rounded-full',
              item.sudah_dicek
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-500/15 border border-amber-500/40'
            )}
            activeOpacity={0.7}
          >
            {item.sudah_dicek ? (
              <>
                <Check size={13} color="#ffffff" />
                <Text className="text-[11px] font-bold text-white ml-1">Sudah Dicek</Text>
              </>
            ) : (
              <>
                <View className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                <Text className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Belum Dicek
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Resi Tracking Number */}
        <View className="my-1">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            No. Resi
          </Text>
          <Text
            className={cn(
              'text-lg font-black tracking-wide',
              item.tracking_number ? 'text-foreground' : 'text-muted-foreground italic'
            )}
            selectable
          >
            {item.tracking_number || '(Belum ada no resi)'}
          </Text>
        </View>

        {/* Invoice & Tracking Status */}
        <View className="flex-row items-center justify-between pt-2 border-t border-border/50 mt-1">
          <View className="flex-1 mr-2">
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {item.marketplace_invoice || item.local_invoice}
            </Text>
          </View>

          {/* Warning / Status Badge */}
          {isCancelled || isTrackingCancelled ? (
            <View className="bg-red-500 rounded-lg px-2 py-0.5 flex-row items-center">
              <AlertTriangle size={12} color="#ffffff" />
              <Text className="text-[11px] font-black text-white ml-1">
                {isCancelled ? 'ORDER CANCELLED' : 'RESI BATAL'}
              </Text>
            </View>
          ) : (
            <View
              className={cn(
                'rounded-lg px-2 py-0.5',
                hasNoTracking
                  ? 'bg-amber-500/10'
                  : 'bg-emerald-500/10'
              )}
            >
              <Text
                className={cn(
                  'text-[11px] font-bold',
                  hasNoTracking
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {trackingStatus || 'NO STATUS'}
              </Text>
            </View>
          )}
        </View>
      </View>
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
      {/* Top App Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-card border-b border-border shadow-sm">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 rounded-full bg-secondary/30"
          >
            <ArrowLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-black text-foreground">Scan Pengecekan Resi</Text>
            <Text className="text-xs text-muted-foreground font-medium">
              Pastikan paket valid sebelum dikirim ke kurir
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => fetchTransactions(true)}
          className="p-2 rounded-full bg-secondary/30"
        >
          <RotateCcw size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View className="bg-card px-4 pt-3 pb-2 border-b border-border/80">
        {/* Date & Courier Select Row */}
        <View className="flex-row gap-2 mb-2.5">
          <View className="flex-1">
            <DatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              placeholder="Pilih Tanggal"
            />
          </View>

          {/* Courier Filter Button */}
          <TouchableOpacity
            onPress={() => setIsCourierModalOpen(true)}
            className="flex-1 flex-row items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-1.5 flex-1 mr-1">
              <Truck size={16} color={colors.primary} />
              <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                {COMMON_COURIERS.find((c) => c.value === selectedCourier)?.label || 'Semua Kurir'}
              </Text>
            </View>
            <ChevronDown size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View className="relative mb-2.5">
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari no resi / no invoice..."
            className="pl-9 pr-8 h-10"
          />
          <View className="absolute left-3 top-3">
            <Search size={16} color={colors.mutedForeground} />
          </View>
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              className="absolute right-3 top-3"
            >
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Pengecekan Filter Tabs */}
        <View className="flex-row rounded-xl bg-secondary/30 p-1 mb-1">
          <TouchableOpacity
            onPress={() => setCheckStatusFilter('false')}
            className={cn(
              'flex-1 py-1.5 rounded-lg items-center justify-center',
              checkStatusFilter === 'false' ? 'bg-amber-500 shadow-sm' : ''
            )}
          >
            <Text
              className={cn(
                'text-xs font-bold',
                checkStatusFilter === 'false' ? 'text-white' : 'text-muted-foreground'
              )}
            >
              Belum Dicek ({uncheckedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCheckStatusFilter('true')}
            className={cn(
              'flex-1 py-1.5 rounded-lg items-center justify-center',
              checkStatusFilter === 'true' ? 'bg-emerald-600 shadow-sm' : ''
            )}
          >
            <Text
              className={cn(
                'text-xs font-bold',
                checkStatusFilter === 'true' ? 'text-white' : 'text-muted-foreground'
              )}
            >
              Sudah Dicek ({checkedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCheckStatusFilter('all')}
            className={cn(
              'flex-1 py-1.5 rounded-lg items-center justify-center',
              checkStatusFilter === 'all' ? 'bg-card shadow-sm' : ''
            )}
          >
            <Text
              className={cn(
                'text-xs font-bold',
                checkStatusFilter === 'all' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              Semua ({totalCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-3 text-xs text-muted-foreground font-semibold">
            Memuat transaksi marketplace...
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id || item.local_invoice || item.tracking_number)}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 80,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchTransactions(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-4">
              <PackageCheck size={52} color={colors.mutedForeground} opacity={0.4} />
              <Text className="mt-3 text-base font-bold text-foreground">
                Tidak ada data transaksi
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground text-center">
                Semua resi pada filter ini telah dicek atau tidak ditemukan data.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating SCAN RESI Button */}
      <View
        className="absolute bottom-5 left-4 right-4"
        style={{ paddingBottom: insets.bottom }}
      >
        <TouchableOpacity
          onPress={() => {
            if (!hasPermission) {
              requestPermission().then((res) => {
                if (res) setIsScannerOpen(true);
                else Alert.alert('Izin Kamera', 'Izin kamera dibutuhkan untuk memindai resi.');
              });
            } else {
              setIsScannerOpen(true);
            }
          }}
          activeOpacity={0.85}
          className="bg-primary flex-row items-center justify-center py-4 rounded-2xl shadow-lg shadow-primary/30"
        >
          <ScanBarcode size={24} color="#ffffff" />
          <Text className="text-white text-base font-black ml-2 uppercase tracking-wider">
            Mulai Scan Resi
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fullscreen Scanner Modal */}
      <Modal
        visible={isScannerOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsScannerOpen(false)}
      >
        <View className="flex-1 bg-black">
          {device && hasPermission ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isScannerOpen && !warningData}
              codeScanner={codeScanner}
              torch={torchEnabled ? 'on' : 'off'}
            />
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-white text-center font-bold mb-4">
                Kamera tidak tersedia atau belum diizinkan.
              </Text>
              <TouchableOpacity
                onPress={requestPermission}
                className="bg-primary px-5 py-2.5 rounded-xl"
              >
                <Text className="text-white font-bold">Minta Izin Kamera</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scanner Overlay UI */}
          <View
            className="flex-1 justify-between"
            style={{
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 20,
            }}
          >
            {/* Top Bar Controls */}
            <View className="flex-row items-center justify-between px-5">
              <TouchableOpacity
                onPress={() => setIsScannerOpen(false)}
                className="w-11 h-11 rounded-full bg-black/60 items-center justify-center"
              >
                <X size={22} color="#ffffff" />
              </TouchableOpacity>

              <View className="bg-black/60 px-4 py-2 rounded-full">
                <Text className="text-white font-extrabold text-xs tracking-wider">
                  CEK RESI: {checkedCount}/{totalCount}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setTorchEnabled((prev) => !prev)}
                className={cn(
                  'w-11 h-11 rounded-full items-center justify-center',
                  torchEnabled ? 'bg-yellow-400' : 'bg-black/60'
                )}
              >
                <Flashlight
                  size={20}
                  color={torchEnabled ? '#000000' : '#ffffff'}
                />
              </TouchableOpacity>
            </View>

            {/* Viewfinder Target Reticle */}
            <View className="items-center justify-center">
              <View className="w-72 h-64 border-2 border-primary/80 rounded-3xl relative items-center justify-center">
                {/* Corner markers */}
                <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />

                <Text className="text-white/80 text-xs font-bold text-center px-4 bg-black/40 py-1.5 rounded-full">
                  Arahkan ke Barcode / QR Resi
                </Text>
              </View>
            </View>

            {/* Bottom Feedback Banner */}
            <View className="px-5">
              {lastScannedFeedback ? (
                <View
                  className={cn(
                    'p-3.5 rounded-2xl mb-2 items-center flex-row shadow-lg',
                    lastScannedFeedback.type === 'success'
                      ? 'bg-emerald-600'
                      : lastScannedFeedback.type === 'warning'
                      ? 'bg-red-600'
                      : 'bg-zinc-800'
                  )}
                >
                  <Text className="text-white font-black text-sm flex-1 text-center">
                    {lastScannedFeedback.text}
                  </Text>
                </View>
              ) : (
                <View className="bg-black/60 p-3 rounded-2xl items-center mb-2">
                  <Text className="text-white/80 text-xs font-semibold">
                    Scan otomatis langsung siap untuk resi berikutnya
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* CRITICAL WARNING MODAL (Order Cancelled / No Tracking) */}
      <Modal
        visible={!!warningData}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View className="flex-1 bg-black/85 items-center justify-center p-5">
          <View className="bg-card w-full max-w-sm rounded-3xl border-2 border-red-500 p-6 items-center shadow-2xl">
            {/* Pulsing Warning Icon */}
            <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center mb-4 border border-red-500">
              <AlertTriangle size={36} color="#ef4444" />
            </View>

            <Text className="text-xl font-black text-red-500 text-center tracking-tight mb-2 uppercase">
              {warningData?.title}
            </Text>

            <Text className="text-sm font-bold text-foreground text-center mb-4 leading-5">
              {warningData?.message}
            </Text>

            {/* Package Detail Box */}
            <View className="w-full bg-secondary/30 rounded-2xl p-4 mb-5 border border-border">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-xs text-muted-foreground">No. Resi:</Text>
                <Text className="text-xs font-black text-foreground">{warningData?.trackingNumber}</Text>
              </View>
              {warningData?.invoice && (
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-xs text-muted-foreground">Invoice:</Text>
                  <Text className="text-xs font-bold text-foreground">{warningData?.invoice}</Text>
                </View>
              )}
              {warningData?.status && (
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-xs text-muted-foreground">Status Transaksi:</Text>
                  <Text className="text-xs font-black text-red-500 uppercase">{warningData?.status}</Text>
                </View>
              )}
              {warningData?.trackingStatus && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">Pelacakan:</Text>
                  <Text className="text-xs font-black text-red-500 uppercase">{warningData?.trackingStatus}</Text>
                </View>
              )}
            </View>

            {/* Acknowledge Button */}
            <TouchableOpacity
              onPress={() => {
                setWarningData(null);
                setTimeout(() => {
                  isProcessingScanRef.current = false;
                }, 500);
              }}
              activeOpacity={0.8}
              className="w-full bg-red-600 py-3.5 rounded-2xl items-center shadow-md shadow-red-600/30"
            >
              <Text className="text-white text-sm font-black uppercase tracking-wider">
                SAYA MENGERTI (PISAHKAN PAKET)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Courier Selection Modal */}
      <Modal
        visible={isCourierModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCourierModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[70%]">
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-border/50">
              <Text className="text-base font-black text-foreground">Pilih Filter Kurir</Text>
              <TouchableOpacity onPress={() => setIsCourierModalOpen(false)}>
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={COMMON_COURIERS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCourier(item.value);
                    setIsCourierModalOpen(false);
                  }}
                  className={cn(
                    'py-3.5 px-4 rounded-xl mb-1.5 flex-row justify-between items-center',
                    selectedCourier === item.value
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-secondary/20'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-bold',
                      selectedCourier === item.value ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {item.label}
                  </Text>
                  {selectedCourier === item.value && (
                    <Check size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
