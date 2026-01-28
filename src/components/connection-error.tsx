import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCcw } from 'lucide-react-native';
import { useThemeColor } from '../lib/colors';
import { useTranslation } from 'react-i18next';

interface ConnectionErrorProps {
  onRetry: () => void;
  message?: string;
}

export function ConnectionError({ onRetry, message }: ConnectionErrorProps) {
  const colors = useThemeColor();
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center p-8">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: colors.red + '20' }}
      >
        <WifiOff size={40} color={colors.red} />
      </View>

      <Text className="text-xl font-black text-foreground text-center mb-2 uppercase tracking-tight">
        {t('common.connectionError') || 'Connection Error'}
      </Text>

      <Text className="text-[13px] font-bold text-muted-foreground text-center mb-8 opacity-70">
        {message ||
          t('common.serverUnavailable') ||
          'The server is currently unavailable. Please check your connection or try again later.'}
      </Text>

      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.8}
        className="flex-row items-center px-6 py-3 rounded-2xl bg-primary shadow-lg"
      >
        <RefreshCcw size={18} color="white" className="mr-2" />
        <Text className="text-white font-black uppercase text-[12px] tracking-widest ml-2">
          {t('common.tryAgain') || 'Try Again'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
