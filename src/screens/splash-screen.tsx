import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from '../components/layout/safe-area-view';
import { useTranslation } from 'react-i18next';
import Logo from '../assets/text-logo.svg';

export function SplashScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView containerClasses="items-center justify-center bg-white dark:bg-background">
      <View className="items-center">
        <View className="mb-8">
          <Logo width={180} height={180} />
        </View>
        <ActivityIndicator size="large" color="#065f3e" />
        <Text className="mt-4 text-muted-foreground font-medium">
          {t('general.loadingApp')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
