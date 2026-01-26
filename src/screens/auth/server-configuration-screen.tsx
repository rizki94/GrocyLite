import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { AppLayout } from '../../components/layout/app-layout';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useConnection } from '../../hooks/use-connection';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';

export function ServerConfigurationScreen() {
  const navigation = useNavigation<any>();
  const { url, setUrl, defaultUrl } = useConnection();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const colors = useThemeColor();

  useEffect(() => {
    if (url) {
      setValue(url);
    }
  }, [url]);

  const handleSave = async () => {
    try {
      setLoading(true);
      await setUrl(value);
      // setUrl in useConnection already saves to AsyncStorage if implemented that way,
      // check use-connection implementation:
      // yes: const updateUrl = async (newUrl: string) => { await AsyncStorage.setItem('@url', newUrl); setUrl(newUrl); };

      navigation.goBack();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title={t('serverConfig.title')} showBack>
      <View className="p-4 flex-1">
        <View className="mb-4">
          <Text className="text-foreground font-medium mb-2">
            {t('serverConfig.serverUrl')}
          </Text>
          <Input
            value={value}
            onChangeText={setValue}
            placeholder="http://example.com"
            autoCapitalize="none"
          />
        </View>

        <View className="gap-3">
          <Button
            label={t('serverConfig.defaultUrl')}
            variant="secondary"
            onPress={() => setValue(defaultUrl)}
          />
          <Button
            label={loading ? t('serverConfig.saving') : t('element.save')}
            onPress={handleSave}
            disabled={loading}
          />
        </View>
      </View>
    </AppLayout>
  );
}
