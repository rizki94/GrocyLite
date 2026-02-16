import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '../../components/ui/card';
import { AuthContext, UserContext } from '../../contexts/app-context';
import {
  User as UserIcon,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { logout } = useContext(AuthContext);
  const user = useContext(UserContext);
  const { colorScheme, setColorScheme } = useColorScheme();
  const { i18n, t } = useTranslation();
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();

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

  const roleName = user?.role_name || user?.role;
  const displayRole = roleName?.toLowerCase() === 'administrator'
    ? t('settings.administrator')
    : (roleName || t('settings.administrator'));

  return (
    <View
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View className="bg-card border-b border-border shadow-sm">
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-2xl font-black text-foreground tracking-tighter">
            {t('settings.title')}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Profile Card */}
        <Card className="mb-8 border-0 shadow-lg overflow-hidden rounded-[32px]">
          <Pressable
            className="p-6 flex-row items-center bg-primary active:opacity-90"
            onPress={() => navigation.navigate('AccountDetail' as never)}
          >
            <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mr-4 border border-white/30 overflow-hidden">
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  className="w-full h-full"
                />
              ) : (
                <UserIcon size={32} color="#ffffff" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-white tracking-tight">
                {user?.name || 'Admin User'}
              </Text>
              <Text className="text-xs font-bold text-white/70 uppercase tracking-widest mt-0.5">
                {displayRole}
              </Text>
            </View>
            <View className="bg-white/10 p-2 rounded-xl">
              <ChevronRight size={18} color="#ffffff" />
            </View>
          </Pressable>
        </Card>

        <Text className="text-xs font-black text-muted-foreground uppercase tracking-[3px] mb-4 ml-1">
          {t('settings.preferences')}
        </Text>
        <Card className="mb-8 overflow-hidden border border-border/50 bg-card rounded-3xl">
          {/* Theme Selector */}
          <Pressable
            className="flex-row items-center justify-between p-5 border-b border-border/10 active:bg-secondary/20"
            onPress={() => setShowThemeModal(true)}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-400/20 items-center justify-center mr-4">
                <Moon size={20} color={colors.blue} />
              </View>
              <Text className="text-foreground font-bold">
                {t('settings.theme')}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-muted-foreground font-medium mr-2">
                {themeLabel}
              </Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>

          {/* Language Selector */}
          <Pressable
            className="flex-row items-center justify-between p-5 active:bg-secondary/20"
            onPress={() => setShowLangModal(true)}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/20 items-center justify-center mr-4">
                <Globe size={20} color={colors.indigo} />
              </View>
              <Text className="text-foreground font-bold">
                {t('settings.languange')}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-muted-foreground font-medium mr-2">
                {languageLabel}
              </Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
        </Card>

        <Text className="text-xs font-black text-muted-foreground uppercase tracking-[3px] mb-4 ml-1">
          {t('settings.account.title')}
        </Text>
        <Card className="mb-8 overflow-hidden border border-border/50 bg-card rounded-3xl">
          <Pressable
            className="flex-row items-center justify-between p-5 active:bg-destructive/10"
            onPress={logout}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-destructive/10 items-center justify-center mr-4">
                <LogOut size={20} color={colors.destructive} />
              </View>
              <Text className="text-destructive font-black">
                {t('element.logout')}
              </Text>
            </View>
          </Pressable>
        </Card>

        <View className="items-center mt-4">
          <Logo width={48} height={48} opacity={0.3} />
          <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-[2px] mt-4 opacity-50">
            {t('settings.version')} 1.0.0 (Build 504)
          </Text>
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
            className="bg-card rounded-[32px] overflow-hidden border border-border/50"
            onPress={e => e.stopPropagation()}
          >
            <View className="p-6 border-b border-border/10">
              <Text className="text-lg font-black text-foreground tracking-tight">
                {t('settings.selectThemeTitle')}
              </Text>
            </View>
            {themes.map(theme => (
              <Pressable
                key={theme.value}
                className="p-5 border-b border-border/5 flex-row items-center justify-between active:bg-secondary/20"
                onPress={async () => {
                  const val = theme.value as 'light' | 'dark' | 'system';
                  setThemePreference(val);
                  setColorScheme(val);
                  await AsyncStorage.setItem('user-theme-preference', val);
                  setShowThemeModal(false);
                }}
              >
                <Text className="text-base text-foreground font-bold">
                  {theme.label}
                </Text>
                {themePreference === theme.value && (
                  <Check size={20} color={colors.primary} strokeWidth={3} />
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
            className="bg-card rounded-[32px] overflow-hidden border border-border/50"
            onPress={e => e.stopPropagation()}
          >
            <View className="p-6 border-b border-border/10">
              <Text className="text-lg font-black text-foreground tracking-tight">
                {t('settings.selectLanguageTitle')}
              </Text>
            </View>
            {languages.map(lang => (
              <Pressable
                key={lang.value}
                className="p-5 border-b border-border/5 flex-row items-center justify-between active:bg-secondary/20"
                onPress={() => {
                  i18n.changeLanguage(lang.value);
                  setShowLangModal(false);
                }}
              >
                <Text className="text-base text-foreground font-bold">
                  {lang.label}
                </Text>
                {currentLanguage === lang.value && (
                  <Check size={20} color={colors.primary} strokeWidth={3} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
