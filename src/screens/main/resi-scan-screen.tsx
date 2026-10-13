import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
  RotateCw,
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
  ChevronRight,
  Filter,
  Info,
  Clock,
  MapPin,
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
  tracking_details?: {
    summary?: {
      courier?: string;
      awb?: string;
      status?: string;
      desc?: string;
      ship_date?: string;
    };
    detail?: {
      origin?: string;
      destination?: string;
      receiver?: string;
      sender?: string;
    };
    history?: Array<{
      date?: string;
      desc?: string;
      location?: string;
      tanggal?: string;
      keterangan?: string;
    }>;
  };
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

  // Tracking Detail Modal state
  const [selectedTrackingItem, setSelectedTrackingItem] = useState<MarketplaceTransactionItem | null>(null);
  const [isRefreshingTracking, setIsRefreshingTracking] = useState<boolean>(false);

  // Scanner locks & cooldowns
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const isScanningLockedRef = useRef<boolean>(false);
  const warningDataRef = useRef<boolean>(false);
  // Track all codes scanned in the current scanner session to detect duplicates
  const scannedInSessionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    warningDataRef.current = !!warningData;
  }, [warningData]);

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

        const response = await apiClient.get('api/online/bridge/transactions/scan-list', { params });
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
        const response = await apiClient.post('api/online/bridge/transactions/mark-checked', {
          tracking_number: codeToProcess,
          sudah_dicek: targetSudahDicek,
        });

        const resData = response?.data;
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
                tracking_status: updatedItem?.tracking_status || item.tracking_status,
                tracking_details: updatedItem?.tracking_details || item.tracking_details,
                tracking_last_checked_at: updatedItem?.tracking_last_checked_at || item.tracking_last_checked_at,
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

  // Refresh live tracking on-demand via CekResi microservice
  const handleRefreshTracking = useCallback(
    async (item: MarketplaceTransactionItem) => {
      if (!item.tracking_number && !item.id) {
        ToastAndroid.show('Nomor resi tidak tersedia untuk dilacak', ToastAndroid.SHORT);
        return;
      }

      setIsRefreshingTracking(true);
      try {
        const response = await apiClient.post('api/online/bridge/transactions/track', {
          transaction_id: item.id,
          awb: item.tracking_number,
          courier_code: item.courier_code || 'spx',
          force: true,
        });

        const resData = response?.data?.data;
        if (resData) {
          const newStatus = resData.tracking_status || resData.summary?.status || item.tracking_status;
          const newDetails = {
            summary: resData.summary,
            detail: resData.detail,
            history: resData.history,
          };
          const nowStr = moment().format('YYYY-MM-DD HH:mm:ss');

          setTransactions((prev) =>
            prev.map((t) => {
              if (
                t.id === item.id ||
                (t.marketplace_invoice && t.marketplace_invoice === item.marketplace_invoice)
              ) {
                return {
                  ...t,
                  tracking_status: newStatus,
                  tracking_details: newDetails,
                  tracking_last_checked_at: nowStr,
                };
              }
              return t;
            })
          );

          setSelectedTrackingItem((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              tracking_status: newStatus,
              tracking_details: newDetails,
              tracking_last_checked_at: nowStr,
            };
          });

          ToastAndroid.show(`Pelacakan diperbarui: ${newStatus}`, ToastAndroid.SHORT);
        } else {
          ToastAndroid.show('Data pelacakan belum tersedia dari kurir', ToastAndroid.SHORT);
        }
      } catch (err: any) {
        console.error('Error refreshing tracking:', err);
        const errMsg = err?.response?.data?.message || 'Gagal memperbarui status pelacakan';
        ToastAndroid.show(errMsg, ToastAndroid.SHORT);
      } finally {
        setIsRefreshingTracking(false);
      }
    },
    [apiClient]
  );

  // Fast Barcode Scanner Processor
  const processScannedCode = useCallback(
    async (code: string) => {
      // ── Duplicate detection (within this scanner session) ──────────────
      if (scannedInSessionRef.current.has(code)) {
        playBeepError();
        setLastScannedFeedback({
          text: `🔁 DUPLIKAT: ${code} sudah pernah di-scan!`,
          type: 'error',
        });
        ToastAndroid.show(`Duplikat! Resi ${code} sudah di-scan.`, ToastAndroid.SHORT);
        setTimeout(() => {
          isScanningLockedRef.current = false;
        }, 1500);
        return;
      }

      try {
        const result = await handleMarkChecked(code, true);

        if (result?.is_warning) {
          // LOUD ERROR BUZZER
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
          // Still mark as seen — subsequent scans of same bad resi = duplicate
          scannedInSessionRef.current.add(code);
        } else {
          // LOUD SUCCESS BEEP
          playBeepSuccess();

          // Mark as seen in session
          scannedInSessionRef.current.add(code);

          setLastScannedFeedback({
            text: `✅ ${code} SUDAH DICEK`,
            type: 'success',
          });

          // Ready for next scan immediately!
          setTimeout(() => {
            isScanningLockedRef.current = false;
          }, 400);
        }
      } catch (err: any) {
        playBeepError();
        const msg = String(err?.response?.data?.message || `Resi '${code}' tidak ditemukan di sistem!`);

        setLastScannedFeedback({
          text: `❌ ${msg}`,
          type: 'error',
        });

        // Show brief toast
        ToastAndroid.show(msg, ToastAndroid.SHORT);

        setTimeout(() => {
          isScanningLockedRef.current = false;
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
      if (isScanningLockedRef.current || warningDataRef.current) {
        return;
      }

      const firstCode = codes[0]?.value?.trim();
      if (!firstCode) return;

      const now = Date.now();
      // Prevent duplicate scan within 2.5s of the same barcode
      if (lastScannedCodeRef.current === firstCode && now - lastScannedTimeRef.current < 2500) {
        return;
      }

      // Lock scanning IMMEDIATELY so upcoming frames don't re-trigger
      isScanningLockedRef.current = true;
      lastScannedCodeRef.current = firstCode;
      lastScannedTimeRef.current = now;

      // Execute safely detached from camera frame thread
      setTimeout(() => {
        processScannedCode(firstCode);
      }, 50);
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
      <TouchableOpacity
        onPress={() => setSelectedTrackingItem(item)}
        activeOpacity={0.8}
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
          <View className="flex-1 flex-row items-center gap-1.5 mr-2">
            <View className="bg-primary/10 rounded-lg px-2.5 py-1 flex-row items-center shrink max-w-[72%]">
              <Truck size={13} color={colors.primary} />
              <Text
                className="text-xs font-bold text-primary ml-1 uppercase"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.courier_raw || item.courier_code || 'KURIR'}
              </Text>
            </View>

            {item.marketplace && (
              <View className="bg-secondary/40 rounded-lg px-2 py-1 shrink-0">
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
              'flex-row items-center px-2.5 py-1 rounded-full shrink-0',
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
          <TouchableOpacity
            onPress={() => setSelectedTrackingItem(item)}
            activeOpacity={0.7}
            className="flex-row items-center"
          >
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
                  'rounded-lg px-2 py-0.5 flex-row items-center',
                  hasNoTracking
                    ? 'bg-amber-500/10'
                    : 'bg-emerald-500/10'
                )}
              >
                <Text
                  className={cn(
                    'text-[11px] font-bold mr-1',
                    hasNoTracking
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {trackingStatus || 'NO STATUS'}
                </Text>
                <ChevronRight
                  size={12}
                  color={hasNoTracking ? colors.mutedForeground : colors.primary}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
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
            paddingBottom: 24,
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

      {/* Docked SCAN RESI Bottom Bar */}
      <View
        className="bg-card border-t border-border px-4 pt-3 shadow-lg"
        style={{
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 10,
          paddingBottom: Math.max(insets.bottom, 14),
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (!hasPermission) {
              requestPermission().then((res) => {
                if (res) {
                  // Fresh session — clear duplicate tracking & feedback
                  scannedInSessionRef.current = new Set();
                  setLastScannedFeedback(null);
                  isScanningLockedRef.current = false;
                  setIsScannerOpen(true);
                }
                else Alert.alert('Izin Kamera', 'Izin kamera dibutuhkan untuk memindai resi.');
              });
            } else {
              // Fresh session — clear duplicate tracking & feedback
              scannedInSessionRef.current = new Set();
              setLastScannedFeedback(null);
              isScanningLockedRef.current = false;
              setIsScannerOpen(true);
            }
          }}
          activeOpacity={0.85}
          className="bg-primary flex-row items-center justify-center py-3.5 rounded-2xl shadow-md shadow-primary/30"
        >
          <ScanBarcode size={22} color="#ffffff" />
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
        onRequestClose={() => {
          scannedInSessionRef.current = new Set();
          setIsScannerOpen(false);
        }}
      >
        <View className="flex-1 bg-black">
          {device && hasPermission ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isScannerOpen}
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
                onPress={() => {
                  scannedInSessionRef.current = new Set();
                  setLastScannedFeedback(null);
                  setIsScannerOpen(false);
                }}
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
            <View style={{ paddingHorizontal: 20 }}>
              <View
                style={{
                  backgroundColor: !lastScannedFeedback
                    ? 'rgba(0,0,0,0.65)'
                    : lastScannedFeedback.type === 'success'
                    ? '#059669'
                    : lastScannedFeedback.type === 'warning'
                    ? '#dc2626'
                    : '#27272a',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontWeight: lastScannedFeedback ? '900' : '600',
                    fontSize: lastScannedFeedback ? 13 : 12,
                    textAlign: 'center',
                  }}
                >
                  {lastScannedFeedback
                    ? lastScannedFeedback.text
                    : 'Scan otomatis langsung siap untuk resi berikutnya'}
                </Text>
              </View>
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
                  isScanningLockedRef.current = false;
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

      {/* Tracking Detail Modal */}
      <Modal
        visible={!!selectedTrackingItem}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTrackingItem(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
            {/* Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-border/60">
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <View className="p-2 rounded-xl bg-primary/10">
                  <Truck size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-black text-foreground">Detail Pelacakan Resi</Text>
                  <Text className="text-xs text-muted-foreground font-medium" numberOfLines={1}>
                    {selectedTrackingItem?.courier_raw || selectedTrackingItem?.courier_code || 'Kurir'} • {selectedTrackingItem?.marketplace?.name || 'Marketplace'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedTrackingItem(null)}
                className="p-2 rounded-full bg-secondary/40"
              >
                <X size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
              {/* Resi & Status Box */}
              <View className="bg-secondary/30 rounded-2xl p-4 mb-3 border border-border">
                <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Nomor Resi
                </Text>
                <Text className="text-xl font-black text-foreground my-1" selectable>
                  {selectedTrackingItem?.tracking_number || '(Belum ada no resi)'}
                </Text>

                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border/40">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-xs text-muted-foreground">Status Pelacakan:</Text>
                    <View
                      className={cn(
                        'px-2.5 py-0.5 rounded-full',
                        selectedTrackingItem?.tracking_status === 'DELIVERED'
                          ? 'bg-emerald-500/15'
                          : selectedTrackingItem?.tracking_status === 'INVALID' || selectedTrackingItem?.tracking_status === 'RETURN'
                          ? 'bg-red-500/15'
                          : 'bg-primary/15'
                      )}
                    >
                      <Text
                        className={cn(
                          'text-xs font-black uppercase',
                          selectedTrackingItem?.tracking_status === 'DELIVERED'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : selectedTrackingItem?.tracking_status === 'INVALID' || selectedTrackingItem?.tracking_status === 'RETURN'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-primary'
                        )}
                      >
                        {selectedTrackingItem?.tracking_status || 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedTrackingItem?.tracking_last_checked_at && (
                  <Text className="text-[10px] text-muted-foreground mt-1.5">
                    Terakhir dicek: {moment(selectedTrackingItem.tracking_last_checked_at).format('DD MMM YYYY, HH:mm')}
                  </Text>
                )}
              </View>

              {/* Action: Refresh Button */}
              {selectedTrackingItem?.tracking_number ? (
                <TouchableOpacity
                  onPress={() => handleRefreshTracking(selectedTrackingItem)}
                  disabled={isRefreshingTracking}
                  activeOpacity={0.8}
                  className="bg-primary/15 border border-primary/30 py-3 rounded-2xl flex-row items-center justify-center mb-4"
                >
                  {isRefreshingTracking ? (
                    <>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text className="text-primary font-black text-xs uppercase ml-2 tracking-wider">
                        Menghubungi Server Kurir...
                      </Text>
                    </>
                  ) : (
                    <>
                      <RotateCw size={16} color={colors.primary} />
                      <Text className="text-primary font-black text-xs uppercase ml-2 tracking-wider">
                        Refresh Status dari Kurir
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              {/* Package Details (if available) */}
              {(selectedTrackingItem?.tracking_details?.detail?.sender ||
                selectedTrackingItem?.tracking_details?.detail?.receiver ||
                selectedTrackingItem?.marketplace_invoice) && (
                <View className="bg-secondary/20 rounded-2xl p-3.5 mb-4 border border-border/60">
                  {selectedTrackingItem?.marketplace_invoice && (
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-muted-foreground">Invoice Marketplace:</Text>
                      <Text className="text-xs font-bold text-foreground">
                        {selectedTrackingItem.marketplace_invoice}
                      </Text>
                    </View>
                  )}
                  {selectedTrackingItem?.local_invoice && (
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-muted-foreground">Invoice ERP:</Text>
                      <Text className="text-xs font-bold text-foreground">
                        {selectedTrackingItem.local_invoice}
                      </Text>
                    </View>
                  )}
                  {selectedTrackingItem?.tracking_details?.detail?.sender && (
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-muted-foreground">Pengirim:</Text>
                      <Text className="text-xs font-bold text-foreground">
                        {selectedTrackingItem.tracking_details.detail.sender}
                      </Text>
                    </View>
                  )}
                  {selectedTrackingItem?.tracking_details?.detail?.receiver && (
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-muted-foreground">Penerima:</Text>
                      <Text className="text-xs font-bold text-foreground">
                        {selectedTrackingItem.tracking_details.detail.receiver}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Riwayat Pelacakan / History Timeline */}
              <View className="mb-6">
                <Text className="text-sm font-black text-foreground mb-3">
                  Riwayat Perjalanan Paket
                </Text>

                {selectedTrackingItem?.tracking_details?.history &&
                selectedTrackingItem.tracking_details.history.length > 0 ? (
                  <View className="pl-2">
                    {selectedTrackingItem.tracking_details.history.map((hist, idx) => {
                      const isLatest = idx === 0;
                      const isLast =
                        idx === selectedTrackingItem.tracking_details!.history!.length - 1;

                      return (
                        <View key={idx} className="flex-row">
                          {/* Timeline vertical line & dot */}
                          <View className="items-center mr-3">
                            <View
                              className={cn(
                                'w-3.5 h-3.5 rounded-full items-center justify-center',
                                isLatest ? 'bg-primary' : 'bg-muted-foreground/30'
                              )}
                            >
                              {isLatest && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </View>
                            {!isLast && <View className="w-0.5 flex-1 bg-border my-1" />}
                          </View>

                          {/* Event Content */}
                          <View className="flex-1 pb-4">
                            <Text
                              className={cn(
                                'text-xs font-black',
                                isLatest ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {hist.desc || hist.keterangan || 'Status diperbarui'}
                            </Text>
                            {(hist.date || hist.tanggal) && (
                              <Text className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                {hist.date || hist.tanggal}
                              </Text>
                            )}
                            {hist.location && (
                              <Text className="text-[10px] text-muted-foreground italic mt-0.5">
                                📍 {hist.location}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="bg-secondary/20 rounded-2xl p-4 items-center justify-center border border-dashed border-border py-6">
                    <Info size={28} color={colors.mutedForeground} opacity={0.5} />
                    <Text className="text-xs font-bold text-foreground mt-2 text-center">
                      Belum ada riwayat pelacakan rinci
                    </Text>
                    <Text className="text-[11px] text-muted-foreground mt-1 text-center">
                      {selectedTrackingItem?.courier_raw?.toLowerCase().includes('instant')
                        ? 'Pengiriman instan marketplace tidak menggunakan airwaybill reguler eksternal.'
                        : 'Tekan "Refresh Status dari Kurir" di atas untuk memperbarui dari ekspedisi.'}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
