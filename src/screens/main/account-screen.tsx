import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  ToastAndroid,
  Image,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
} from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { UserContext, AuthContext } from '../../contexts/app-context';
import { useFetchWithParams } from '../../hooks/use-fetch';
import { useConnection } from '../../hooks/use-connection';
import { useTranslation } from 'react-i18next';
import { Camera, User, Image as ImageIcon, X } from 'lucide-react-native';
import { useThemeColor } from '../../lib/colors';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export function AccountScreen() {
  const { t } = useTranslation();
  const user = useContext(UserContext);
  const { refresh } = useContext(AuthContext);
  const colors = useThemeColor();
  const { apiClient } = useConnection();
  const [refreshing, setRefreshing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  const [data, setData] = useState({
    name: '',
    full_name: '',
    password: '',
    confirm_password: '',
  });

  const [avatar, setAvatar] = useState<any>(null);

  const { data: userData, isLoading } = useFetchWithParams(
    'api/user/show',
    { params: { id: user?.id } },
    user,
    refreshing,
  );

  useEffect(() => {
    // console.log('AccountScreen userData:', userData);
    // console.log('AccountScreen context user:', user);

    if (userData || user) {
      const actualData = userData?.data || userData?.user || (Array.isArray(userData) ? null : userData) || user;

      if (actualData && typeof actualData === 'object' && !Array.isArray(actualData)) {
        // console.log('AccountScreen setting data from:', actualData);
        setData(prev => ({
          ...prev,
          name: actualData.name || actualData.username || prev.name || '',
          full_name: actualData.full_name || actualData.fullname || prev.full_name || '',
        }));

        if (actualData.avatar) {
          setAvatar({ uri: actualData.avatar });
        } else if (actualData.avatar_img) {
          // Fallback if avatar accessor not available
          setAvatar({ uri: `${apiClient.defaults.baseURL}/uploads/avatar/${actualData.avatar_img}` });
        }
      }
    }
  }, [userData, user, apiClient.defaults.baseURL]);

  const handleChange = (key: string, value: string) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async (useCamera: boolean) => {
    const options: any = {
      mediaType: 'photo',
      quality: 0.7,
    };

    const result = useCamera
      ? await launchCamera(options)
      : await launchImageLibrary(options);

    if (result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0]);
    }
    setShowImagePickerModal(false);
  };

  const handleSubmit = async () => {
    setButtonLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('full_name', data.full_name);
      if (data.password) {
        formData.append('password', data.password);
        formData.append('confirm_password', data.confirm_password);
      }

      if (avatar && avatar.uri && !avatar.uri.startsWith('http')) {
        // Only append if it's a new file (local URI)
        formData.append('avatar', {
          uri: avatar.uri,
          type: avatar.type || 'image/jpeg',
          name: avatar.fileName || avatar.name || `avatar_${Date.now()}.jpg`,
        } as any);
      }

      const response = await apiClient.post('/api/bridge/change_password', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout
      });

      if (response.data.status === 200) {
        ToastAndroid.show(
          response.data.message || t('settings.account.updateSuccess'),
          ToastAndroid.SHORT,
        );
        // Refresh local user data to show updated name/avatar immediately
        try {
          await refresh();
        } catch (refreshErr) {
          console.error('Failed to refresh user after update:', refreshErr);
        }
      } else if (response.data.status === 422) {
        const errors = Object.values(response.data.validateErr || {});
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
      console.error('Update account error:', e);
      ToastAndroid.show(e.message || 'Network error', ToastAndroid.SHORT);
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <AppLayout title={t('settings.account.myAccount')} showBack>
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="items-center py-6">
          <TouchableOpacity
            onPress={() => setShowImagePickerModal(true)}
            className="relative"
          >
            <View className="w-24 h-24 rounded-full bg-secondary items-center justify-center overflow-hidden border-2 border-primary/20">
              {avatar ? (
                <Image source={{ uri: avatar.uri }} className="w-full h-full" />
              ) : (
                <User size={48} color={colors.mutedForeground} />
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-card">
              <Camera size={16} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {t('general.change')}
          </Text>
        </View>

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

          <View className="h-4" />
          <Text className="text-xs font-black text-muted-foreground uppercase tracking-[2px] mb-2 px-1">
            {t('settings.account.password')}
          </Text>

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
            className="mt-4 mb-10"
          />
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowImagePickerModal(false)}
        >
          <View className="bg-card rounded-t-[32px] p-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-black text-foreground tracking-tight">
                {t('general.change')} Avatar
              </Text>
              <TouchableOpacity onPress={() => setShowImagePickerModal(false)}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={() => pickImage(true)}
                className="flex-1 bg-secondary/30 p-6 rounded-2xl items-center"
              >
                <Camera size={32} color={colors.primary} />
                <Text className="mt-2 font-bold text-foreground">
                  {t('settings.account.openCamera')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pickImage(false)}
                className="flex-1 bg-secondary/30 p-6 rounded-2xl items-center"
              >
                <ImageIcon size={32} color={colors.primary} />
                <Text className="mt-2 font-bold text-foreground">
                  {t('settings.account.openImageLibrary')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </AppLayout>
  );
}
