import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { useThemeColor } from '../../lib/colors';
import { useConnection } from '../../hooks/use-connection';
import { useAuth } from '../../hooks/use-auth';
import { LeafletMap } from '../../components/map/leaflet-map';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

export function AttendanceRouteScreen({ route }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { apiClient } = useConnection();
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const userId = route.params?.userId || state.user?.id; // Use current user if not specified
  const date = route.params?.date || moment().format('YYYY-MM-DD');

  const fetchRouteData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/attendance/route', {
        params: { user_id: userId, date: date },
      });
      if (response.data.status === 200) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch route data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRouteData();
    }
  }, [userId]);

  if (loading) {
    return (
      <AppLayout title={t('attendance.myRoute')} showBack>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AppLayout>
    );
  }

  const markers: any[] = [];
  const routeCoords: any[] = [];

  // Helper to push marker and coord
  const addPoint = (
    lat: any,
    lng: any,
    type: string,
    title: string,
    desc: string,
  ) => {
    if (lat && lng) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      markers.push({
        latitude: latNum,
        longitude: lngNum,
        type: type,
        title: title,
        description: desc,
      });
      routeCoords.push({ latitude: latNum, longitude: lngNum });
    }
  };

  if (data?.attendance) {
    // Check In
    addPoint(
      data.attendance.check_in_latitude,
      data.attendance.check_in_longitude,
      'checkin',
      t('attendance.checkIn'),
      moment(data.attendance.check_in_time).format('h:mm a'),
    );
  }

  // Visits
  if (data?.visits) {
    data.visits.forEach((v: any) => {
      addPoint(
        v.latitude,
        v.longitude,
        'visit',
        v.contact?.name || t('attendance.visit'),
        moment(v.visit_time).format('h:mm a'),
      );
    });
  }

  if (data?.attendance) {
    // Check Out
    addPoint(
      data.attendance.check_out_latitude,
      data.attendance.check_out_longitude,
      'checkout',
      t('attendance.checkOut'),
      moment(data.attendance.check_out_time).format('h:mm a'),
    );
  }

  const center = routeCoords.length > 0 ? routeCoords[0] : undefined;

  return (
    <AppLayout title={t('attendance.myRoute')} showBack>
      <View className="flex-1">
        <LeafletMap
          markers={markers}
          routeCoordinates={routeCoords}
          center={center}
        />
        <View className="absolute bottom-6 left-4 right-4 bg-white/90 dark:bg-card/90 p-4 rounded-2xl shadow-lg border border-border pointer-events-none">
          <Text className="font-bold text-foreground">
            {t('attendance.routeSummary')}
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            {date === moment().format('YYYY-MM-DD')
              ? t('general.today')
              : moment(date).format('MMMM Do')}{' '}
            • {data?.visits?.length || 0} {t('attendance.visits')}
          </Text>
        </View>
      </View>
    </AppLayout>
  );
}
