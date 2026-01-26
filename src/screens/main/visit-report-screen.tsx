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
} from 'lucide-react-native';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import { useConnection } from '../../hooks/use-connection';
import { Loading } from '../../components/ui/loading';
import { useFetch } from '../../hooks/use-fetch';
import { useTranslation } from 'react-i18next';

export function VisitReportScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { apiClient } = useConnection();
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [photo, setPhoto] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);

  const { data: contacts, isLoading: loadingContacts } = useFetch(
    'api/contact/customer/active',
  );

  const filteredContacts = React.useMemo(() => {
    if (!Array.isArray(contacts)) return [];
    if (!searchQuery) return contacts.slice(0, 10);
    return contacts
      .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 20);
  }, [contacts, searchQuery]);

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

      // Get current location
      const coords = location || (await getLocation());

      const formData = new FormData();
      formData.append('latitude', String(coords.latitude));
      formData.append('longitude', String(coords.longitude));

      if (selectedContact?.id) {
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
        <Text className="text-sm font-bold text-muted-foreground uppercase mb-2 px-1">
          {t('attendance.selectCustomer')}
        </Text>

        <Card className="mb-6 p-2">
          <View className="relative mb-2">
            <View className="absolute left-3 top-2.5 z-10">
              <Search size={18} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder={t('attendance.searchCustomerPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="h-10 pl-10 bg-background border border-border rounded-lg"
            />
          </View>

          {selectedContact && (
            <View className="bg-primary/10 p-3 rounded-lg mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <User
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text className="text-primary font-bold">
                  {selectedContact.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedContact(null)}>
                <Text className="text-destructive font-bold text-xs">
                  {t('element.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!selectedContact &&
            filteredContacts.map((contact: any) => (
              <TouchableOpacity
                key={contact.id}
                onPress={() => setSelectedContact(contact)}
                className="p-3 border-b border-border active:bg-secondary/50 flex-row items-center"
              >
                <User
                  size={16}
                  color={colors.mutedForeground}
                  style={{ marginRight: 10 }}
                />
                <Text className="text-foreground">{contact.name}</Text>
              </TouchableOpacity>
            ))}

          {loadingContacts && (
            <Text className="p-4 text-center text-xs text-muted-foreground">
              {t('attendance.loadingCustomers')}
            </Text>
          )}
        </Card>

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
