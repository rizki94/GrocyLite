import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Modal,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFetch } from '../../hooks/use-fetch';
import { useConnection } from '../../hooks/use-connection';
import { useThemeColor } from '../../lib/colors';
import { numberWithComma } from '../../utils/helpers';
import { cn } from '../../lib/utils';
import {
  ArrowLeft,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Tag,
  DollarSign,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';

export interface PriceRequestItem {
  id: number;
  product_pkey: string;
  product_name: string;
  source: 'PKP' | 'NON' | string;
  price_type: string;
  current_price: number | null;
  lower_price: number;
  highest_price: number;
  status: 'submitted' | 'reviewed' | 'approved' | 'disapproved';
  approved_price: number | null;
  disapproval_reason: string | null;
  submitted_by: number;
  reviewed_by: number | null;
  approved_by: number | null;
  salesman_type?: 'regular' | 'online';
  marketplace_id?: number | null;
  proof_image?: string | null;
  created_at?: string;
  submitter?: { id: number; name: string };
  reviewer?: { id: number; name: string };
  approver?: { id: number; name: string };
  marketplace?: { id: number; name: string };
}

export function PriceRequestApproveScreen() {
  const colors = useThemeColor();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { apiClient, url: baseUrl } = useConnection();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'disapproved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Approval modal states
  const [approveModalItem, setApproveModalItem] = useState<PriceRequestItem | null>(null);
  const [priceOption, setPriceOption] = useState<'lowest' | 'highest' | 'custom'>('lowest');
  const [customPrice, setCustomPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Disapproval modal states
  const [disapproveModalItem, setDisapproveModalItem] = useState<PriceRequestItem | null>(null);
  const [disapproveReason, setDisapproveReason] = useState('');

  // Proof image full modal
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  const {
    data: priceRequests,
    isLoading,
    fetchError,
    refetch,
  } = useFetch('api/price_request/list', refreshing);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }, [refetch]);

  const itemsList: PriceRequestItem[] = useMemo(() => {
    if (!Array.isArray(priceRequests)) return [];
    return priceRequests;
  }, [priceRequests]);

  const filteredItems = useMemo(() => {
    let result = itemsList;

    if (activeTab === 'pending') {
      result = result.filter(item => item.status === 'submitted' || item.status === 'reviewed');
    } else if (activeTab === 'approved') {
      result = result.filter(item => item.status === 'approved');
    } else if (activeTab === 'disapproved') {
      result = result.filter(item => item.status === 'disapproved');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.product_name?.toLowerCase().includes(q) ||
          item.product_pkey?.toLowerCase().includes(q) ||
          item.submitter?.name?.toLowerCase().includes(q) ||
          item.price_type?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [itemsList, activeTab, searchQuery]);

  const counts = useMemo(() => {
    const pending = itemsList.filter(
      item => item.status === 'submitted' || item.status === 'reviewed',
    ).length;
    const approved = itemsList.filter(item => item.status === 'approved').length;
    const disapproved = itemsList.filter(item => item.status === 'disapproved').length;
    return { pending, approved, disapproved };
  }, [itemsList]);

  // Review action
  const handleReview = async (item: PriceRequestItem) => {
    try {
      setIsSubmitting(true);
      await apiClient.post('api/price_request/review', { id: item.id });
      Alert.alert('Sukses', `Pengajuan harga untuk ${item.product_name} ditandai sudah ditinjau.`);
      onRefresh();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Gagal meninjau pengajuan';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Approve Modal
  const openApproveModal = (item: PriceRequestItem) => {
    setApproveModalItem(item);
    setPriceOption('lowest');
    setCustomPrice(item.lower_price?.toString() || '');
  };

  // Submit Approval
  const handleSubmitApprove = async () => {
    if (!approveModalItem) return;

    if (priceOption === 'custom') {
      const num = parseFloat(customPrice);
      if (isNaN(num) || num < 0) {
        Alert.alert('Perhatian', 'Mohon masukkan harga kustom yang valid.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('api/price_request/approve', {
        id: approveModalItem.id,
        price_option: priceOption,
        custom_price: priceOption === 'custom' ? parseFloat(customPrice) : undefined,
      });

      Alert.alert(
        'Berhasil Disetujui',
        `Pengajuan harga untuk ${approveModalItem.product_name} telah disetujui dan harga di ERP telah diperbarui.`,
      );
      setApproveModalItem(null);
      onRefresh();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Gagal menyetujui pengajuan harga';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Disapprove Modal
  const openDisapproveModal = (item: PriceRequestItem) => {
    setDisapproveModalItem(item);
    setDisapproveReason('');
  };

  // Submit Disapproval
  const handleSubmitDisapprove = async () => {
    if (!disapproveModalItem) return;
    if (!disapproveReason.trim()) {
      Alert.alert('Perhatian', 'Mohon isi alasan penolakan.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('api/price_request/disapprove', {
        id: disapproveModalItem.id,
        reason: disapproveReason.trim(),
      });

      Alert.alert('Pengajuan Ditolak', `Pengajuan harga untuk ${disapproveModalItem.product_name} ditolak.`);
      setDisapproveModalItem(null);
      onRefresh();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Gagal menolak pengajuan harga';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFullImageUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  };

  const renderItem = ({ item }: { item: PriceRequestItem }) => {
    const isPending = item.status === 'submitted' || item.status === 'reviewed';
    const isPkp = item.source === 'PKP';
    const imageUrl = getFullImageUrl(item.proof_image);

    return (
      <Card className="mb-3 mx-4 p-4 border border-border/60 shadow-sm bg-card">
        {/* Header: Source, Type, Status */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-1.5 flex-wrap flex-1 mr-2">
            <View
              className={cn(
                'px-2 py-0.5 rounded-md',
                isPkp ? 'bg-emerald-500/15' : 'bg-blue-500/15',
              )}
            >
              <Text
                className={cn(
                  'text-[10px] font-black uppercase',
                  isPkp ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400',
                )}
              >
                {item.source}
              </Text>
            </View>
            <View className="px-2 py-0.5 rounded-md bg-secondary/30">
              <Text className="text-[10px] font-bold text-foreground font-mono">
                {item.price_type}
              </Text>
            </View>
            {item.salesman_type === 'online' && (
              <View className="px-2 py-0.5 rounded-md bg-purple-500/15">
                <Text className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  Online {item.marketplace?.name ? `(${item.marketplace.name})` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Status Badge */}
          <View
            className={cn(
              'px-2 py-0.5 rounded-full flex-row items-center gap-1',
              item.status === 'submitted' && 'bg-amber-500/15',
              item.status === 'reviewed' && 'bg-blue-500/15',
              item.status === 'approved' && 'bg-emerald-500/15',
              item.status === 'disapproved' && 'bg-destructive/15',
            )}
          >
            {item.status === 'submitted' && <Clock size={11} color={colors.amber || '#f59e0b'} />}
            {item.status === 'reviewed' && <Eye size={11} color={colors.blue || '#3b82f6'} />}
            {item.status === 'approved' && <CheckCircle2 size={11} color={colors.green || '#10b981'} />}
            {item.status === 'disapproved' && <XCircle size={11} color={colors.destructive || '#ef4444'} />}
            <Text
              className={cn(
                'text-[10px] font-extrabold uppercase',
                item.status === 'submitted' && 'text-amber-600 dark:text-amber-400',
                item.status === 'reviewed' && 'text-blue-600 dark:text-blue-400',
                item.status === 'approved' && 'text-emerald-600 dark:text-emerald-400',
                item.status === 'disapproved' && 'text-destructive',
              )}
            >
              {item.status === 'submitted'
                ? 'Diajukan'
                : item.status === 'reviewed'
                  ? 'Ditinjau'
                  : item.status === 'approved'
                    ? 'Disetujui'
                    : 'Ditolak'}
            </Text>
          </View>
        </View>

        {/* Product Name */}
        <Text className="text-sm font-black text-foreground mb-1 tracking-tight">
          {item.product_name}
        </Text>
        <Text className="text-[10px] font-mono text-muted-foreground mb-3 opacity-70">
          PKey: {item.product_pkey}
        </Text>

        {/* Price Comparison Block */}
        <View className="bg-secondary/15 rounded-xl p-3 mb-3 border border-border/30">
          <View className="flex-row justify-between items-center mb-1.5 pb-1.5 border-b border-border/20">
            <Text className="text-[11px] font-medium text-muted-foreground">Harga Saat Ini</Text>
            <Text className="text-xs font-bold text-foreground">
              {item.current_price !== null ? `Rp ${numberWithComma(item.current_price)}` : '-'}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-[11px] font-medium text-muted-foreground">Rentang Diajukan</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-black text-primary">
                Rp {numberWithComma(item.lower_price)}
              </Text>
              <Text className="text-[11px] text-muted-foreground">s/d</Text>
              <Text className="text-xs font-black text-primary">
                Rp {numberWithComma(item.highest_price)}
              </Text>
            </View>
          </View>

          {item.status === 'approved' && item.approved_price !== null && (
            <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-border/20">
              <Text className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Harga Disetujui
              </Text>
              <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                Rp {numberWithComma(item.approved_price)}
              </Text>
            </View>
          )}

          {item.status === 'disapproved' && item.disapproval_reason && (
            <View className="mt-2 pt-2 border-t border-border/20">
              <Text className="text-[10px] font-bold text-destructive mb-0.5">Alasan Penolakan:</Text>
              <Text className="text-[11px] text-foreground italic">"{item.disapproval_reason}"</Text>
            </View>
          )}
        </View>

        {/* Submitter Info & Proof Image Link */}
        <View className="flex-row justify-between items-center pt-2 border-t border-border/20">
          <View className="flex-1 mr-2">
            <Text className="text-[10px] font-bold text-muted-foreground">
              Diajukan oleh: <Text className="text-foreground">{item.submitter?.name || 'Sales'}</Text>
            </Text>
            {item.approver?.name && (
              <Text className="text-[10px] font-bold text-muted-foreground">
                Diproses oleh: <Text className="text-foreground">{item.approver.name}</Text>
              </Text>
            )}
          </View>

          {imageUrl && (
            <TouchableOpacity
              onPress={() => setViewingProofUrl(imageUrl)}
              className="px-2.5 py-1 rounded-lg bg-primary/10 flex-row items-center gap-1 border border-primary/20"
            >
              <Eye size={12} color={colors.primary} />
              <Text className="text-[10px] font-bold text-primary">Bukti Foto</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons for Pending */}
        {isPending && (
          <View className="flex-row gap-2 mt-3 pt-3 border-t border-border/20">
            {item.status === 'submitted' && (
              <TouchableOpacity
                onPress={() => handleReview(item)}
                disabled={isSubmitting}
                className="flex-1 h-9 rounded-xl bg-secondary/50 items-center justify-center flex-row gap-1 border border-border/50"
              >
                <Eye size={14} color={colors.foreground} />
                <Text className="text-xs font-bold text-foreground">Tinjau</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => openDisapproveModal(item)}
              disabled={isSubmitting}
              className="flex-1 h-9 rounded-xl bg-destructive/15 items-center justify-center flex-row gap-1 border border-destructive/30"
            >
              <XCircle size={14} color={colors.destructive} />
              <Text className="text-xs font-bold text-destructive">Tolak</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openApproveModal(item)}
              disabled={isSubmitting}
              className="flex-1 h-9 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1 shadow-sm"
            >
              <CheckCircle2 size={14} color="#ffffff" />
              <Text className="text-xs font-bold text-white">Setujui</Text>
            </TouchableOpacity>
          </View>
        )}
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
      {/* Header */}
      <View className="bg-card border-b border-border shadow-sm">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full">
              <ArrowLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <View className="ml-2">
              <Text className="text-xl font-black text-foreground">Persetujuan Harga</Text>
              <Text className="text-[10px] text-muted-foreground font-medium">
                Persetujuan pengajuan harga produk dari sales
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 bg-secondary/20 rounded-full">
            <RotateCcw size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="px-4 pb-3">
          <Input
            placeholder="Cari produk / sales / kode..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="bg-secondary/15 h-10 border-border/50 rounded-xl font-bold text-xs pl-10"
            leftIcon={<Search size={16} color={colors.mutedForeground} />}
          />
        </View>

        {/* Tabs */}
        <View className="flex-row px-4 pb-3 gap-2">
          <Pressable
            onPress={() => setActiveTab('pending')}
            className={cn(
              'flex-1 py-2 rounded-xl items-center justify-center border',
              activeTab === 'pending'
                ? 'bg-primary border-primary'
                : 'bg-card border-border/50',
            )}
          >
            <Text
              className={cn(
                'text-xs font-black uppercase tracking-tight',
                activeTab === 'pending' ? 'text-white' : 'text-foreground',
              )}
            >
              Menunggu ({counts.pending})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('approved')}
            className={cn(
              'flex-1 py-2 rounded-xl items-center justify-center border',
              activeTab === 'approved'
                ? 'bg-emerald-600 border-emerald-600'
                : 'bg-card border-border/50',
            )}
          >
            <Text
              className={cn(
                'text-xs font-black uppercase tracking-tight',
                activeTab === 'approved' ? 'text-white' : 'text-foreground',
              )}
            >
              Disetujui ({counts.approved})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('disapproved')}
            className={cn(
              'flex-1 py-2 rounded-xl items-center justify-center border',
              activeTab === 'disapproved'
                ? 'bg-destructive border-destructive'
                : 'bg-card border-border/50',
            )}
          >
            <Text
              className={cn(
                'text-xs font-black uppercase tracking-tight',
                activeTab === 'disapproved' ? 'text-white' : 'text-foreground',
              )}
            >
              Ditolak ({counts.disapproved})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* List */}
      <FlatList
        className="flex-1 pt-3"
        data={filteredItems}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          fetchError ? (
            <ConnectionError onRetry={onRefresh} message={fetchError} />
          ) : !isLoading ? (
            <View className="flex-1 items-center justify-center pt-24 px-6">
              <Tag size={42} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 12 }} />
              <Text className="text-center font-bold text-foreground text-sm mb-1">
                Tidak ada pengajuan harga
              </Text>
              <Text className="text-center text-muted-foreground text-xs">
                {activeTab === 'pending'
                  ? 'Semua pengajuan harga telah diproses.'
                  : `Belum ada data untuk status ${activeTab}.`}
              </Text>
            </View>
          ) : null
        }
      />

      <Loading isLoading={isLoading || isSubmitting} />

      {/* Approve Modal */}
      <Modal
        visible={!!approveModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setApproveModalItem(null)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 shadow-2xl">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <CheckCircle2 size={20} color={colors.green || '#10b981'} />
                <Text className="text-base font-black text-foreground">Setujui Harga</Text>
              </View>
              <TouchableOpacity onPress={() => setApproveModalItem(null)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {approveModalItem && (
              <>
                <Text className="text-xs text-muted-foreground mb-1">Produk:</Text>
                <Text className="text-sm font-bold text-foreground mb-4">
                  {approveModalItem.product_name} ({approveModalItem.price_type})
                </Text>

                <Text className="text-xs font-semibold text-foreground mb-2">Pilih Harga Disetujui:</Text>

                {/* Option 1: Lowest */}
                <TouchableOpacity
                  onPress={() => setPriceOption('lowest')}
                  className={cn(
                    'p-3 rounded-xl border mb-2 flex-row justify-between items-center',
                    priceOption === 'lowest'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border/50 bg-secondary/15',
                  )}
                >
                  <View>
                    <Text className="text-xs font-bold text-foreground">Harga Terendah</Text>
                    <Text className="text-[10px] text-muted-foreground">Sesuai batas bawah pengajuan</Text>
                  </View>
                  <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    Rp {numberWithComma(approveModalItem.lower_price)}
                  </Text>
                </TouchableOpacity>

                {/* Option 2: Highest */}
                <TouchableOpacity
                  onPress={() => setPriceOption('highest')}
                  className={cn(
                    'p-3 rounded-xl border mb-2 flex-row justify-between items-center',
                    priceOption === 'highest'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border/50 bg-secondary/15',
                  )}
                >
                  <View>
                    <Text className="text-xs font-bold text-foreground">Harga Tertinggi</Text>
                    <Text className="text-[10px] text-muted-foreground">Sesuai batas atas pengajuan</Text>
                  </View>
                  <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    Rp {numberWithComma(approveModalItem.highest_price)}
                  </Text>
                </TouchableOpacity>

                {/* Option 3: Custom */}
                <TouchableOpacity
                  onPress={() => setPriceOption('custom')}
                  className={cn(
                    'p-3 rounded-xl border mb-3',
                    priceOption === 'custom'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border/50 bg-secondary/15',
                  )}
                >
                  <Text className="text-xs font-bold text-foreground mb-1.5">Harga Kustom</Text>
                  {priceOption === 'custom' ? (
                    <Input
                      keyboardType="numeric"
                      placeholder="Masukkan harga baru (Rp)..."
                      value={customPrice}
                      onChangeText={setCustomPrice}
                      className="h-10 text-xs font-bold bg-background"
                    />
                  ) : (
                    <Text className="text-[10px] text-muted-foreground">Tentukan nominal sendiri</Text>
                  )}
                </TouchableOpacity>

                {/* Actions */}
                <View className="flex-row gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onPress={() => setApproveModalItem(null)}
                    disabled={isSubmitting}
                  >
                    <Text className="text-xs font-bold text-foreground">Batal</Text>
                  </Button>
                  <Button
                    className="flex-1 h-11 bg-emerald-600"
                    onPress={handleSubmitApprove}
                    disabled={isSubmitting}
                  >
                    <Text className="text-xs font-bold text-white">Konfirmasi Setuju</Text>
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Disapprove Modal */}
      <Modal
        visible={!!disapproveModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setDisapproveModalItem(null)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 shadow-2xl">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <XCircle size={20} color={colors.destructive} />
                <Text className="text-base font-black text-foreground">Tolak Pengajuan Harga</Text>
              </View>
              <TouchableOpacity onPress={() => setDisapproveModalItem(null)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {disapproveModalItem && (
              <>
                <Text className="text-xs text-muted-foreground mb-1">Produk:</Text>
                <Text className="text-sm font-bold text-foreground mb-3">
                  {disapproveModalItem.product_name}
                </Text>

                <Text className="text-xs font-semibold text-foreground mb-1.5">
                  Alasan Penolakan <Text className="text-destructive">*</Text>:
                </Text>
                <Input
                  multiline
                  numberOfLines={3}
                  placeholder="Tuliskan alasan kenapa harga ini tidak disetujui..."
                  value={disapproveReason}
                  onChangeText={setDisapproveReason}
                  className="h-20 text-xs font-medium bg-secondary/15 mb-4 text-left align-top pt-2"
                />

                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onPress={() => setDisapproveModalItem(null)}
                    disabled={isSubmitting}
                  >
                    <Text className="text-xs font-bold text-foreground">Batal</Text>
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 h-11"
                    onPress={handleSubmitDisapprove}
                    disabled={isSubmitting}
                  >
                    <Text className="text-xs font-bold text-destructive-foreground">Konfirmasi Tolak</Text>
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Proof Image Viewer Modal */}
      <Modal
        visible={!!viewingProofUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingProofUrl(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center p-4">
          <TouchableOpacity
            onPress={() => setViewingProofUrl(null)}
            className="absolute top-12 right-6 p-2 bg-white/20 rounded-full z-10"
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {viewingProofUrl && (
            <Image
              source={{ uri: viewingProofUrl }}
              className="w-full h-4/5 rounded-xl"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

