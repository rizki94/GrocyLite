import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Card } from '../../components/ui/card';
import { useThemeColor } from '../../lib/colors';
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Navigation,
  User,
} from 'lucide-react-native';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import { useConnection } from '../../hooks/use-connection';
import moment from 'moment';
import { Loading } from '../../components/ui/loading';
import { useTranslation } from 'react-i18next';

export function AttendanceScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { apiClient } = useConnection();
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [attendance, setAttendance] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [selfie, setSelfie] = useState<any>(null);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        return (
          granted['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.CAMERA'] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const getStatus = useCallback(async () => {
    try {
      setFetchingStatus(true);
      const response = await apiClient.get('/api/attendance/status');
      if (response.data.status === 200) {
        setAttendance(response.data.data);

        // If checked in, fetch today's visits
        if (response.data.data) {
          const routeResponse = await apiClient.get('/api/attendance/route', {
            params: {
              user_id: response.data.data.user_id,
              date: moment().format('YYYY-MM-DD'),
            },
          });
          if (routeResponse.data.status === 200) {
            setVisits(routeResponse.data.data.visits || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance status', error);
    } finally {
      setFetchingStatus(false);
    }
  }, [apiClient]);

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          setLocation(position.coords);
          resolve(position.coords);
        },
        error => {
          Alert.alert(
            t('element.error'),
            t('attendance.getLocation') + ': ' + error.message,
          );
          reject(error);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 },
      );
    });
  };

  const takeSelfie = async () => {
    const options: any = {
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.5,
      saveToPhotos: false,
    };

    const result = await launchCamera(options);
    if (result.assets && result.assets.length > 0) {
      setSelfie(result.assets[0]);
    }
  };

  const handleCheckIn = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        t('attendance.permissionDenied'),
        t('attendance.permissionDeniedContent'),
      );
      return;
    }

    if (!selfie) {
      Alert.alert(
        t('attendance.missingSelfie'),
        t('attendance.missingSelfieContent'),
      );
      return;
    }

    try {
      setLoading(true);
      let coords: any = location;

      if (!coords) {
        try {
          coords = await getCurrentLocation();
        } catch (e) {
          console.log('Loc error', e);
          Alert.alert(
            t('attendance.locationError'),
            t('attendance.locationErrorContent') ||
              'Could not get current location. Please try again.',
          );
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append('latitude', String(coords.latitude));
      formData.append('longitude', String(coords.longitude));

      if (selfie) {
        formData.append('selfie', {
          uri: selfie.uri,
          type: selfie.type || 'image/jpeg',
          name: selfie.fileName || `selfie_${Date.now()}.jpg`,
        } as any);
      }

      const response = await apiClient.post(
        '/api/attendance/check-in',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (response.data.status === 200) {
        Alert.alert(t('element.success'), t('attendance.checkInSuccess'));
        setAttendance(response.data.data);
      } else {
        Alert.alert(
          t('element.error'),
          response.data.message || t('attendance.checkInFailed'),
        );
      }
    } catch (error) {
      console.error('Check-in error', error);
      Alert.alert(t('element.error'), t('attendance.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      const coords: any = await getCurrentLocation();

      const response = await apiClient.post('/api/attendance/check-out', {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (response.data.status === 200) {
        Alert.alert(t('element.success'), t('attendance.checkOutSuccess'));
        setAttendance(response.data.data);
      } else {
        Alert.alert(
          t('element.error'),
          response.data.message || t('attendance.checkOutFailed'),
        );
      }
    } catch (error) {
      console.error('Check-out error', error);
      Alert.alert(t('element.error'), t('attendance.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStatus();

    const initLocation = async () => {
      const hasPerm = await requestPermissions();
      if (hasPerm) {
        try {
          // Used cached location if available from context/store if we had one,
          // but here we just fetch fresh.
          getCurrentLocation().catch(err =>
            console.log('Auto-fetch location error', err),
          );
        } catch (e) {
          console.log(e);
        }
      }
    };
    initLocation();
  }, [getStatus]);

  if (fetchingStatus) {
    return (
      <AppLayout title={t('attendance.title')} showBack>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('attendance.title')} showBack>
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {!attendance ? (
          <View>
            <Card className="p-6 mb-6 items-center border-dashed border-2 border-primary/30">
              <View className="w-48 h-48 bg-secondary/30 rounded-2xl items-center justify-center mb-4 overflow-hidden">
                {selfie ? (
                  <Image
                    source={{ uri: selfie.uri }}
                    className="w-full h-full"
                  />
                ) : (
                  <Camera size={64} color={colors.primary} opacity={0.3} />
                )}
              </View>
              <TouchableOpacity
                onPress={takeSelfie}
                className="bg-primary/10 px-6 py-3 rounded-xl flex-row items-center"
              >
                <Camera
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text className="text-primary font-bold">
                  {selfie
                    ? t('attendance.retakeSelfie')
                    : t('attendance.takeSelfie')}
                </Text>
              </TouchableOpacity>
            </Card>

            <Card className="mb-8 p-4">
              <View className="flex-row items-center mb-4">
                <MapPin
                  size={24}
                  color={colors.primary}
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text className="text-sm text-muted-foreground">
                    {t('attendance.currentLocation')}
                  </Text>
                  <Text className="text-foreground font-medium">
                    {location
                      ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                      : t('attendance.waitingForGps')}
                  </Text>
                  {!location && (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const hasPerm = await requestPermissions();
                          if (hasPerm) await getCurrentLocation();
                        } catch (e) {
                          console.log(e);
                        }
                      }}
                      className="mt-2 bg-secondary p-2 rounded items-center"
                    >
                      <Text className="text-xs font-bold text-secondary-foreground">
                        {t('attendance.getLocation')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text className="text-xs text-muted-foreground italic">
                {t('attendance.locationNotice')}
              </Text>
            </Card>

            <TouchableOpacity
              onPress={handleCheckIn}
              disabled={loading}
              className="bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/30 active:opacity-90"
            >
              <Text className="text-white text-lg font-bold">
                {t('attendance.confirmCheckIn')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Card className="mb-6 p-6 items-center bg-primary">
              <View className="bg-white/20 p-4 rounded-full mb-3">
                <CheckCircle2 size={48} color="white" />
              </View>
              <Text className="text-white text-xl font-bold">
                {t('attendance.checkedIn')}
              </Text>
              <Text className="text-white/80 mt-1">
                {moment(attendance.check_in_time).format(
                  'MMMM Do YYYY, h:mm a',
                )}
              </Text>
            </Card>

            <View className="flex-row gap-4 mb-6">
              <TouchableOpacity
                onPress={() => navigation.navigate('VisitReport')}
                className="flex-1 bg-white dark:bg-card border border-border p-5 rounded-2xl items-center shadow-sm"
              >
                <Navigation size={32} color={colors.primary} />
                <Text className="text-foreground font-bold mt-3">
                  {t('attendance.reportVisit')}
                </Text>
                <Text className="text-muted-foreground text-[10px] mt-1 text-center">
                  {t('attendance.reportVisitSubtitle')}
                </Text>
              </TouchableOpacity>

              {attendance.check_out_time ? (
                <View className="flex-1 bg-secondary/20 border border-border p-5 rounded-2xl items-center">
                  <Clock size={32} color={colors.mutedForeground} />
                  <Text className="text-muted-foreground font-bold mt-3 text-center">
                    {t('attendance.finished')}
                  </Text>
                  <Text className="text-muted-foreground text-[10px] mt-1 text-center">
                    {t('attendance.checkedOutAt')}{' '}
                    {moment(attendance.check_out_time).format('h:mm a')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleCheckOut}
                  disabled={loading}
                  className="flex-1 bg-destructive/10 border border-destructive/20 p-5 rounded-2xl items-center shadow-sm"
                >
                  <Clock size={32} color={colors.destructive} />
                  <Text className="text-destructive font-bold mt-3">
                    {t('attendance.checkOut')}
                  </Text>
                  <Text className="text-destructive/60 text-[10px] mt-1 text-center">
                    {t('attendance.endWorkDay')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text className="text-lg font-bold text-foreground mb-4 px-1">
              {t('attendance.todayVisits')}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AttendanceRoute')}
              className="flex-row items-center bg-secondary/10 p-4 rounded-xl mb-4"
            >
              <History
                size={20}
                color={colors.primary}
                style={{ marginRight: 10 }}
              />
              <Text className="text-primary font-medium flex-1">
                {t('attendance.viewMapRoute')}
              </Text>
              <Navigation size={16} color={colors.primary} />
            </TouchableOpacity>

            <Card className="p-1 mb-8">
              {visits.length === 0 ? (
                <View className="p-10 items-center">
                  <AlertCircle
                    size={32}
                    color={colors.mutedForeground}
                    opacity={0.5}
                  />
                  <Text className="text-muted-foreground mt-2">
                    {t('attendance.noVisits')}
                  </Text>
                </View>
              ) : (
                <View className="p-2">
                  {visits.map((visit: any, index: number) => (
                    <View
                      key={index}
                      className="p-4 border-b border-border last:border-b-0"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1">
                          <User
                            size={16}
                            color={colors.primary}
                            style={{ marginRight: 8 }}
                          />
                          <Text className="text-foreground font-bold flex-1">
                            {visit.contact?.name || 'Visit Report'}
                          </Text>
                        </View>
                        <Text className="text-xs text-muted-foreground">
                          {moment(visit.visit_time).format('HH:mm')}
                        </Text>
                      </View>
                      {visit.contact?.address && (
                        <Text className="text-xs text-muted-foreground ml-6 mb-1">
                          📍 {visit.contact.address}
                        </Text>
                      )}
                      {visit.notes && (
                        <Text className="text-sm text-muted-foreground ml-6 italic">
                          "{visit.notes}"
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>
        )}
      </ScrollView>
      <Loading isLoading={loading} />
    </AppLayout>
  );
}
