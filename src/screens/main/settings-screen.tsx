import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLayout } from '../../components/layout/app-layout';
import { Card } from '../../components/ui/card';
import { AuthContext, UserContext } from '../../contexts/app-context';
import {
  User,
  LogOut,
  Moon,
  Globe,
  ChevronRight,
  Check,
} from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '../../lib/colors';
import Logo from '../../assets/logo.svg';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { logout } = useContext(AuthContext);
  const user = useContext(UserContext);
  const { colorScheme, setColorScheme } = useColorScheme();
  const { i18n, t } = useTranslation();
  const colors = useThemeColor();

  const [themePreference, setThemePreference] = useState<
    'light' | 'dark' | 'system'
  >('system');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user-theme-preference').then(val => {
      if (val) setThemePreference(val as any);
    });
  }, []);

  const currentLanguage = i18n.language || 'en';
  const languageLabel =
    currentLanguage === 'id' ? 'Bahasa Indonesia' : 'English';

  const themeLabel =
    themePreference === 'dark'
      ? t('settings.selectTheme.dark')
      : themePreference === 'light'
        ? t('settings.selectTheme.light')
        : t('settings.selectTheme.systemDefault');

  const themes = [
    { label: t('settings.selectTheme.light'), value: 'light' },
    { label: t('settings.selectTheme.dark'), value: 'dark' },
    { label: t('settings.selectTheme.systemDefault'), value: 'system' },
  ];

  const languages = [
    { label: t('settings.selectLanguange.english'), value: 'en' },
    { label: t('settings.selectLanguange.bahasa'), value: 'id' },
  ];

  return (
    <AppLayout title={t('settings.title')}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Card */}
        <Card className="mb-6 bg-primary border-0">
          <Pressable
            className="p-4 flex-row items-center active:opacity-80"
            onPress={() => navigation.navigate('AccountDetail' as never)}
          >
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mr-4">
              <User size={32} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white mb-1">
                {user?.name || 'Admin User'}
              </Text>
              <Text className="text-sm text-white/80">
                {t('settings.administrator')}
              </Text>
            </View>
            <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </Card>

        <Text className="text-sm font-bold text-muted-foreground uppercase mb-2 px-1">
          {t('settings.preferences')}
        </Text>
        <Card className="mb-6 overflow-hidden border border-border bg-card">
          {/* Theme Selector */}
          <Pressable
            className="flex-row items-center justify-between p-4 border-b border-border active:bg-secondary/50"
            onPress={() => setShowThemeModal(true)}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/20 items-center justify-center mr-3">
                <Moon size={18} color={colors.blue} />
              </View>
              <Text className="text-foreground font-medium text-foreground">
                {t('settings.theme')}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-muted-foreground mr-2">{themeLabel}</Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>

          {/* Language Selector */}
          <Pressable
            className="flex-row items-center justify-between p-4 active:bg-secondary/50"
            onPress={() => setShowLangModal(true)}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/20 items-center justify-center mr-3">
                <Globe size={18} color={colors.indigo} />
              </View>
              <Text className="text-foreground font-medium text-foreground">
                {t('settings.languange')}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-muted-foreground mr-2">
                {languageLabel}
              </Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
        </Card>

        <Text className="text-sm font-bold text-muted-foreground uppercase mb-2 px-1">
          {t('settings.account.title')}
        </Text>
        <Card className="mb-8 overflow-hidden border border-border bg-card">
          <Pressable
            className="flex-row items-center justify-between p-4 active:bg-destructive/10"
            onPress={logout}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-destructive/10 items-center justify-center mr-3">
                <LogOut size={18} color={colors.destructive} />
              </View>
              <Text className="text-foreground font-medium text-destructive">
                {t('element.logout')}
              </Text>
            </View>
          </Pressable>
        </Card>

        <Text className="text-xs text-center text-muted-foreground mb-4">
          {t('settings.version')} 1.0.0 (Build 504)
        </Text>
        <View className="items-center mb-8 opacity-20">
          <Logo width={60} height={60} />
        </View>
      </ScrollView>

      {/* Theme Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center px-6"
          onPress={() => setShowThemeModal(false)}
        >
          <Pressable
            className="bg-card rounded-lg overflow-hidden"
            onPress={e => e.stopPropagation()}
          >
            <View className="p-4 border-b border-border">
              <Text className="text-lg font-bold text-foreground">
                {t('settings.selectThemeTitle')}
              </Text>
            </View>
            {themes.map(theme => (
              <Pressable
                key={theme.value}
                className="p-4 border-b border-border flex-row items-center justify-between active:bg-secondary/20"
                onPress={async () => {
                  const val = theme.value as 'light' | 'dark' | 'system';
                  setThemePreference(val);

                  // Simpler is better: Let NativeWind handle 'system' reset via the index.js patch
                  setColorScheme(val);

                  await AsyncStorage.setItem('user-theme-preference', val);
                  setShowThemeModal(false);
                }}
              >
                <Text className="text-base text-foreground">{theme.label}</Text>
                {themePreference === theme.value && (
                  <Check size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center px-6"
          onPress={() => setShowLangModal(false)}
        >
          <Pressable
            className="bg-card rounded-lg overflow-hidden"
            onPress={e => e.stopPropagation()}
          >
            <View className="p-4 border-b border-border">
              <Text className="text-lg font-bold text-foreground">
                {t('settings.selectLanguageTitle')}
              </Text>
            </View>
            {languages.map(lang => (
              <Pressable
                key={lang.value}
                className="p-4 border-b border-border flex-row items-center justify-between active:bg-secondary/20"
                onPress={() => {
                  i18n.changeLanguage(lang.value);
                  setShowLangModal(false);
                }}
              >
                <Text className="text-base text-foreground">{lang.label}</Text>
                {currentLanguage === lang.value && (
                  <Check size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </AppLayout>
  );
}
