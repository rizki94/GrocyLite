import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useThemeColor } from '../../lib/colors';
import {
  Navigation,
  User,
  Search,
  CheckCircle2,
  Camera,
  MapPin,
  RefreshCw,
  Cloud,
} from 'lucide-react-native';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import { useConnection } from '../../hooks/use-connection';
import { Loading } from '../../components/ui/loading';
import { useFetch } from '../../hooks/use-fetch';
import { useTranslation } from 'react-i18next';

import { useOffline } from '../../hooks/use-offline';

import { CustomerSearchModal } from '../../components/attendance/customer-search-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function VisitReportScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { apiClient } = useConnection();
  const { isOffline, addToQueue, queue, processQueue, isSyncing } = useOffline();
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [attendance, setAttendance] = useState<any>(null);

  const { data: contacts, isLoading: loadingContacts, refetch: refetchContacts } = useFetch(
    '/api/contact/customer/active',
  );

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const cached = await AsyncStorage.getItem('@attendance_status');
        if (cached) {
          const status = JSON.parse(cached);
          setAttendance(status);
          if (status.check_out_time) {
            Alert.alert(
              t('element.error'),
              t('attendance.alreadyCheckedOutVisitNotice') || 'Cannot report visit after checkout',
              [{ text: t('general.ok'), onPress: () => navigation.goBack() }]
            );
          }
        }
      } catch (e) {
        console.log(e);
      }
    };
    checkStatus();
  }, []);

  const takePhoto = async () => {
    const options: any = {
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.7,
      saveToPhotos: false,
    };

    const result = await launchCamera(options);
    if (result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  };

  const getLocation = async () => {
    try {
      const position = await new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          pos => resolve(pos),
          err => reject(err),
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 },
        );
      });
      setLocation(position.coords);
      return position.coords;
    } catch (error) {
      Alert.alert(
        t('attendance.locationError'),
        t('attendance.getLocation') + ' ' + t('element.failed'),
      );
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!selectedContact && (!notes || !notes.trim())) {
        Alert.alert(t('element.error'), t('attendance.descriptionRequiredIfNoCustomer') || 'Visit description is required if no customer is selected');
        setLoading(false);
        return;
      }

      // Get current location
      const coords = location || (await getLocation());

      if (isOffline) {
        const offlineData: any = {
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          notes: notes || undefined,
          contact_id: selectedContact ? String(selectedContact.id) : undefined,
        };

        if (photo) {
          offlineData.photo = {
            uri: photo.uri,
            type: photo.type || 'image/jpeg',
            name: photo.fileName || `visit_${Date.now()}.jpg`,
          };
        }

        await addToQueue('/api/attendance/visit', 'POST', offlineData, { 'Content-Type': 'multipart/form-data' }, 'Visit Report', true);

        Alert.alert(t('element.success'), t('element.savedOffline'), [
          { text: t('general.ok'), onPress: () => navigation.goBack() },
        ]);
        setLoading(false);
        return;
      }

      if (!selectedContact && (!notes || !notes.trim())) {
        Alert.alert(t('element.error'), t('attendance.descriptionRequiredIfNoCustomer') || 'Visit description is required if no customer is selected');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('latitude', String(coords.latitude));
      formData.append('longitude', String(coords.longitude));
      if (selectedContact) {
        formData.append('contact_id', String(selectedContact.id));
      }

      if (notes) {
        formData.append('notes', notes);
      }

      if (photo) {
        formData.append('photo', {
          uri: photo.uri,
          type: photo.type || 'image/jpeg',
          name: photo.fileName || `visit_${Date.now()}.jpg`,
        } as any);
      }

      const response = await apiClient.post('/api/attendance/visit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 200) {
        Alert.alert(t('element.success'), t('attendance.reportSuccess'), [
          { text: t('general.ok'), onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert(
          t('element.error'),
          response.data.message || t('attendance.reportFailed'),
        );
      }
    } catch (error: any) {
      console.error('Visit report error', error);
      Alert.alert(
        t('element.error'),
        error.message || t('attendance.reportFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation().catch(err => console.log('Auto location error', err));
  }, []);

  return (
    <AppLayout title={t('attendance.reportVisit')} showBack>
      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        {/* Offline Banner */}
        {isOffline && (
          <View className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl">
            <Text className="text-orange-600 font-bold text-sm text-center">
              📡 {t('element.offline')} - {t('element.showingCachedData')}
            </Text>
          </View>
        )}

        {/* Sync Queue Banner */}
        {!isOffline && queue.length > 0 && (
          <TouchableOpacity
            onPress={() => processQueue()}
            disabled={isSyncing}
            className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-2xl flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="mr-3">
                <Cloud size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-primary font-bold text-sm">
                  {t('element.pendingActions')} ({queue.length})
                </Text>
                <Text className="text-primary/60 text-[10px] uppercase font-bold tracking-tighter">
                  {isSyncing ? 'Syncing...' : t('element.syncNow')}
                </Text>
              </View>
            </View>
            <View className={isSyncing ? 'animate-spin' : ''}>
              <RefreshCw
                size={18}
                color={colors.primary}
              />
            </View>
          </TouchableOpacity>
        )}

        <View className="flex-row items-center justify-between mb-2 px-1">
          <Text className="text-sm font-bold text-muted-foreground uppercase">
            {t('attendance.selectCustomer')}
          </Text>
          {!isOffline && (
            <TouchableOpacity onPress={() => refetchContacts()} className="flex-row items-center">
              <RefreshCw size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text className="text-xs text-primary font-bold">
                {t('element.refresh') || 'Refresh'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          className="mb-6"
        >
          <Card className={`p-4 flex-row items-center justify-between ${selectedContact ? 'border-primary bg-primary/5' : 'border-dashed border-2'}`}>
            <View className="flex-row items-center flex-1">
              <User
                size={20}
                color={selectedContact ? colors.primary : colors.mutedForeground}
                style={{ marginRight: 12 }}
              />
              <View className="flex-1">
                <Text className={`font-bold ${selectedContact ? 'text-primary' : 'text-muted-foreground'}`}>
                  {selectedContact ? selectedContact.name : t('attendance.clickToSelectCustomer') || 'Click to select customer'}
                </Text>
                {selectedContact?.address && (
                  <Text className="text-xs text-primary/60 line-clamp-1" numberOfLines={1}>
                    {selectedContact.address}
                  </Text>
                )}
              </View>
            </View>
            <Search size={18} color={selectedContact ? colors.primary : colors.mutedForeground} />
          </Card>
        </TouchableOpacity>

        <CustomerSearchModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          customers={Array.isArray(contacts) ? contacts : []}
          onSelect={setSelectedContact}
          selectedId={selectedContact?.id}
        />

        <Text className="text-sm font-bold text-muted-foreground uppercase mb-2 px-1">
          {t('attendance.photoOptional')}
        </Text>
        <Card className="mb-6 p-4 items-center">
          <View className="w-full h-48 bg-secondary/30 rounded-xl items-center justify-center mb-3 overflow-hidden">
            {photo ? (
              <Image source={{ uri: photo.uri }} className="w-full h-full" />
            ) : (
              <Camera size={48} color={colors.mutedForeground} opacity={0.3} />
            )}
          </View>
          <TouchableOpacity
            onPress={takePhoto}
            className="bg-primary/10 px-6 py-3 rounded-xl flex-row items-center"
          >
            <Camera
              size={20}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text className="text-primary font-bold">
              {photo ? t('attendance.retakePhoto') : t('attendance.takePhoto')}
            </Text>
          </TouchableOpacity>
        </Card>

        <Text className="text-sm font-bold text-muted-foreground uppercase mb-2 px-1">
          {t('attendance.currentLocation')}
        </Text>
        <Card className="mb-6 p-4">
          <View className="flex-row items-center">
            <MapPin
              size={20}
              color={colors.primary}
              style={{ marginRight: 10 }}
            />
            <View>
              <Text className="text-xs text-muted-foreground">
                {t('attendance.gpsCoordinates')}
              </Text>
              <Text className="text-foreground font-medium">
                {location
                  ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                  : t('attendance.gettingLocation')}
              </Text>
            </View>
          </View>
        </Card>

        <Text className="text-sm font-bold text-muted-foreground uppercase mb-2 px-1">
          {t('attendance.visitDescription')}
        </Text>
        <Card className="mb-8 p-1">
          <Input
            multiline
            numberOfLines={4}
            placeholder={t('attendance.visitDescriptionPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
            className="h-32 border-0 bg-transparent"
          />
        </Card>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !location}
          className="bg-primary p-5 rounded-2xl items-center shadow-lg active:opacity-90 flex-row justify-center"
        >
          <Navigation size={24} color="white" style={{ marginRight: 10 }} />
          <Text className="text-white text-lg font-bold uppercase">
            {t('attendance.sendVisitReport')}
          </Text>
        </TouchableOpacity>

        <Text className="text-xs text-center text-muted-foreground mt-4 px-4 italic">
          {t('attendance.attachedNotice')}
        </Text>
      </ScrollView>
      <Loading isLoading={loading} />
    </AppLayout>
  );
}
