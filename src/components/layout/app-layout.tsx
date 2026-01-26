import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { cn } from '../../lib/utils';
import { useThemeColor } from '../../lib/colors';

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
  containerClasses?: string;
  contentContainerClasses?: string;
  showBack?: boolean;
}

import Logo from '../../assets/logo.svg';

export function AppLayout({
  title,
  children,
  containerClasses,
  contentContainerClasses,
  showBack,
}: LayoutProps) {
  const navigation = useNavigation();
  const colors = useThemeColor();

  return (
    <SafeAreaView
      className={cn('flex-1 bg-background', containerClasses)}
      edges={['top']}
    >
      <View className="px-4 py-3 border-b border-border">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            {showBack ? (
              <Pressable
                onPress={() => navigation.goBack()}
                className="p-1 rounded-full active:bg-secondary"
              >
                <ArrowLeft size={24} color={colors.foreground} />
              </Pressable>
            ) : (
              <Logo width={32} height={32} />
            )}
            <Text className="text-2xl font-bold text-foreground">
              {title || 'Dashboard'}
            </Text>
          </View>
        </View>
      </View>
      <View className={cn('flex-1 p-2', contentContainerClasses)}>
        {children}
      </View>
    </SafeAreaView>
  );
}
