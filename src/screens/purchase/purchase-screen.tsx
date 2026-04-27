import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { dateFormatted, numberWithComma } from '../../utils/helpers';
import {
  ArrowLeft,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Camera,
  Image as ImageIcon,
  FileCheck,
} from 'lucide-react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Card } from '../../components/ui/card';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Loading } from '../../components/ui/loading';
import { ConnectionError } from '../../components/connection-error';
import { DatePicker } from '../../components/ui/date-picker';
import { cn } from '../../lib/utils';
import { useConnection } from '../../hooks/use-connection';
import { Alert, ToastAndroid, Image as RNImage, Modal } from 'react-native';

export function PurchaseScreen() {
  const { t } = useTranslation();
  const { apiClient, url } = useConnection();
  const colors = useThemeColor();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const {
    data: purchaseData,
    isLoading,
    fetchError,
    refetch,
  } = useFetchWithParams(
    'api/bridge/purchase',
    { params: { date: dateFormatted(date) } },
    [date],
    refreshing,
  );


  const onRefresh = useCallback(() => {
    setRefreshing(prev => !prev);
    refetch();
  }, [refetch]);


  const groupedPurchases = useMemo(() => {
    const list = Array.isArray(purchaseData)
      ? purchaseData
      : purchaseData && typeof purchaseData === 'object'
        ? Object.values(purchaseData)
        : [];

    if (list.length === 0) return [];

    const grouped: Record<string, any> = {};
    list.forEach((item: any) => {
      if (!item) return;
      const name = item.CompanyName || item.companyname || 'Unknown';
      if (!grouped[name]) {
        grouped[name] = {
          CompanyName: name,
          Total: 0,
          invoices: {},
        };
      }
      const amount = Number(item.Amount ?? item.amount ?? 0);
      const noTr = item.NoTr || 'No Invoice';
      
      if (!grouped[name].invoices[noTr]) {
        grouped[name].invoices[noTr] = {
          NoTr: noTr,
          Total: 0,
          Type: item.purchase_type || 'Regular',
          ImagePath: item.image_path,
          items: [],
        };
      }
      
      grouped[name].Total += amount;
      grouped[name].invoices[noTr].Total += amount;
      grouped[name].invoices[noTr].items.push({
        ...item,
        Product_Name: item.Product_Name || item.product_name || 'Unknown',
        Unit: item.Unit || item.unit || '-',
        Amount: amount,
        Qty: Number(item.Qty ?? item.qty ?? 0),
      });
    });

    // Convert invoices object to array for each company
    return Object.values(grouped).map((comp: any) => ({
      ...comp,
      invoices: Object.values(comp.invoices),
    }));
  }, [purchaseData]);

  const toggleExpand = (companyName: string) => {
    setExpandedCompanies(prev =>
      prev.includes(companyName)
        ? prev.filter(c => c !== companyName)
        : [...prev, companyName],
    );
  };

  const handleUploadImage = async (noTr: string) => {
    const options: any = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    Alert.alert(
      t('purchase.uploadInvoiceImage'),
      t('purchase.selectImageSource'),
      [
        {
          text: t('general.camera'),
          onPress: () => launchCamera(options, response => processUpload(noTr, response)),
        },
        {
          text: t('general.gallery'),
          onPress: () => launchImageLibrary(options, response => processUpload(noTr, response)),
        },
        { text: t('element.cancel'), style: 'cancel' },
      ],
    );
  };

  const processUpload = async (noTr: string, response: any) => {
    if (response.didCancel || response.errorCode) return;

    const asset = response.assets?.[0];
    if (!asset) return;

    const formData = new FormData();
    formData.append('invoice_number', noTr);
    formData.append('image', {
      uri: asset.uri,
      type: asset.type,
      name: asset.fileName || `invoice_${noTr}.jpg`,
    } as any);

    setIsUploading(true);
    try {
      const uploadRes = await apiClient.post('api/transaction/purchase/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (uploadRes.data.status === 200 || uploadRes.status === 200) {
        ToastAndroid.show(t('general.success'), ToastAndroid.SHORT);
        refetch();

      } else {
        Alert.alert(t('general.error'), uploadRes.data.message || t('error.failedToUpload'));
      }
    } catch (e: any) {
      Alert.alert(t('general.error'), e.message || t('error.serverNotAvailable'));
    } finally {
      setIsUploading(false);
    }
  };

  const grandTotal = useMemo(() => {
    return groupedPurchases.reduce((acc, curr) => acc + curr.Total, 0);
  }, [groupedPurchases]);

  const renderGroup = ({ item: comp }: { item: any }) => {
    const isExpanded = expandedCompanies.includes(comp.CompanyName);
    return (
      <View className="mb-4 mx-4 border border-border/50 bg-card rounded-3xl shadow-sm overflow-hidden">
        <Pressable
          className={cn(
            'p-4 flex-row items-center justify-between active:bg-secondary/5',
            isExpanded && 'bg-secondary/10',
          )}
          onPress={() => toggleExpand(comp.CompanyName)}
        >
          <View className="flex-1 pr-4">
            <View className="flex-row items-center gap-2">
              <Text className="font-extrabold text-foreground uppercase tracking-tight">
                {comp.CompanyName}
              </Text>
              {comp.invoices.some((inv: any) => inv.ImagePath) && (
                <ImageIcon size={12} color="#10b981" />
              )}
            </View>
            <Text className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
              {t('element.total')}: {numberWithComma(comp.Total)}
            </Text>
          </View>
          <View className="w-8 h-8 rounded-full bg-secondary/10 items-center justify-center">
            {isExpanded ? (
              <ChevronUp size={16} color={colors.foreground} />
            ) : (
              <ChevronDown size={16} color={colors.foreground} />
            )}
          </View>
        </Pressable>

        {isExpanded && (
          <View className="p-4 bg-card/50">
            {comp.invoices.map((inv: any, idx: number) => (
              <View key={idx} className={cn('mb-6', idx !== comp.invoices.length - 1 && 'border-b border-border/10 pb-4')}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[11px] font-black text-foreground uppercase">
                        {inv.NoTr}
                      </Text>
                      <View className={cn(
                        'px-2 py-0.5 rounded-full',
                        inv.Type === 'OP' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                      )}>
                        <Text className={cn(
                          'text-[8px] font-black',
                          inv.Type === 'OP' ? 'text-orange-600' : 'text-blue-600'
                        )}>
                          {inv.Type}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[10px] font-bold text-primary mt-0.5">
                      {numberWithComma(inv.Total)}
                    </Text>
                  </View>
                  
                  <View className="flex-row gap-2">
                    {inv.ImagePath && (
                      <TouchableOpacity
                        onPress={() => setViewingImage(inv.ImagePath)}
                        className="w-8 h-8 rounded-xl bg-green-500/10 items-center justify-center border border-green-500/20"
                      >
                        <ImageIcon size={14} color="#10b981" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleUploadImage(inv.NoTr)}
                      className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center border border-primary/20"
                    >
                      <Camera size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="bg-secondary/5 rounded-2xl p-3">
                  <View className="flex-row mb-2 border-b border-border/10 pb-1">
                    <Text className="flex-[2] text-[9px] font-black uppercase text-muted-foreground">PRODUCT</Text>
                    <Text className="flex-1 text-[9px] font-black uppercase text-muted-foreground text-right">QTY</Text>
                    <Text className="flex-1 text-[9px] font-black uppercase text-muted-foreground text-right">TOTAL</Text>
                  </View>
                  {inv.items.map((item: any, i: number) => (
                    <View key={i} className="flex-row py-1">
                      <Text className="flex-[2] text-[10px] font-bold text-foreground pr-2" numberOfLines={1}>
                        {item.Product_Name}
                      </Text>
                      <Text className="flex-1 text-[10px] font-black text-muted-foreground text-right">
                        {numberWithComma(item.Qty)}
                      </Text>
                      <Text className="flex-1 text-[10px] font-black text-foreground text-right">
                        {numberWithComma(item.Amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
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
              {t('dashboard.purchaseReport')}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="p-2 rounded-full">
            <RotateCcw size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-4">
          <View className="mb-4">
            <DatePicker value={date} onChange={setDate} />
          </View>

          <View className="p-6 rounded-2xl bg-primary border border-primary/20 shadow-lg items-center">
            <Text className="text-primary-foreground text-xs font-bold uppercase tracking-[2px] opacity-80 mb-2">
              {t('element.grandTotal')}
            </Text>
            <Text className="font-black text-4xl text-white">
              {numberWithComma(grandTotal)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1 pt-4"
        data={
          fetchError && groupedPurchases.length === 0 ? [] : groupedPurchases
        }
        keyExtractor={item => item.CompanyName}
        renderItem={renderGroup}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          fetchError && groupedPurchases.length === 0 ? (
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
      <Loading isLoading={isLoading || isUploading} />

      {/* Image Viewer Modal */}
      <Modal
        visible={!!viewingImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View className="flex-1 bg-black/90 items-center justify-center">
          <TouchableOpacity
            onPress={() => setViewingImage(null)}
            className="absolute top-12 right-6 z-10 p-4 bg-white/10 rounded-full"
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          {viewingImage && (
            <RNImage
              source={{
                uri: `${url?.replace(/\/$/, '')}/${viewingImage.replace(/^\//, '')}`,
              }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
