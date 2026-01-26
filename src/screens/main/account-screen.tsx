import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, ToastAndroid } from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { UserContext } from '../../contexts/app-context';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { useConnection } from '../../hooks/use-connection';
import { useTranslation } from 'react-i18next';

export function AccountScreen() {
  const { t } = useTranslation();
  const user = useContext(UserContext);
  const { apiClient } = useConnection();
  const [refreshing, setRefreshing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [data, setData] = useState({
    name: '',
    full_name: '',
    password: '',
    confirm_password: '',
  });

  const { data: userData, isLoading } = useFetchWithParams(
    'api/user/show',
    { params: { id: user?.id } },
    user,
    refreshing,
  );

  useEffect(() => {
    if (userData) {
      setData(prev => ({ ...prev, ...userData }));
    }
  }, [userData]);

  const handleChange = (key: string, value: string) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setButtonLoading(true);
    try {
      const response = await apiClient.post('/api/bridge/change_password', {
        data: data,
      });

      if (response.data.status === 200) {
        ToastAndroid.show(
          response.data.message || t('settings.account.updateSuccess'),
          ToastAndroid.SHORT,
        );
      } else if (response.data.status === 422) {
        const errors = Object.values(response.data.validateErr);
        errors.forEach((err: any) =>
          ToastAndroid.show(err[0], ToastAndroid.SHORT),
        );
      } else {
        ToastAndroid.show(
          response.data.message || t('settings.account.updateError'),
          ToastAndroid.SHORT,
        );
      }
    } catch (e: any) {
      ToastAndroid.show(e.message || 'Network error', ToastAndroid.SHORT);
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <AppLayout title={t('settings.account.myAccount')} showBack>
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="gap-2 space-y-4 pt-4">
          <Input
            label={t('settings.account.name')}
            value={data.name}
            onChangeText={v => handleChange('name', v)}
          />
          <Input
            label={t('settings.account.fullName')}
            value={data.full_name}
            onChangeText={v => handleChange('full_name', v)}
          />

          <Input
            label={t('settings.account.newPassword')}
            value={data.password}
            onChangeText={v => handleChange('password', v)}
            secureTextEntry
            placeholder={t('settings.account.minChars')}
          />
          <Input
            label={t('settings.account.confirm_password')}
            value={data.confirm_password}
            onChangeText={v => handleChange('confirm_password', v)}
            secureTextEntry
            placeholder={t('settings.account.reenterPassword')}
          />

          <Button
            label={
              buttonLoading
                ? t('serverConfig.saving')
                : t('settings.account.saveChanges')
            }
            onPress={handleSubmit}
            disabled={buttonLoading || isLoading}
            className="mt-4"
          />
        </View>
      </ScrollView>
    </AppLayout>
  );
}
