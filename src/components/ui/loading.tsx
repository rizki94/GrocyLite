import { ActivityIndicator, Text, View } from 'react-native';
import { useThemeColor } from '../../lib/colors';
import { useTranslation } from 'react-i18next';

export function Loading({ isLoading }: { isLoading: boolean }) {
  const colors = useThemeColor();
  const { t } = useTranslation();
  return (
    isLoading && (
      <View className="absolute inset-0 bg-background/30 items-center justify-center rounded-xl">
        <View className="bg-card p-4 rounded-xl shadow-lg flex-row items-center border border-border">
          <ActivityIndicator color={colors.primary} />
          <Text className="ml-3 font-bold text-foreground">
            {t('general.loading')}
          </Text>
        </View>
      </View>
    )
  );
}
