import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from '../../components/layout/safe-area-view';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { LogIn, Settings } from 'lucide-react-native';
import { AuthContext } from '../../contexts/app-context';
import { useThemeColor } from '../../lib/colors';

import { useTranslation } from 'react-i18next';
import Logo from '../../assets/text-logo.svg';

export function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const { login } = React.useContext(AuthContext);
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async () => {
    if (!name || !password) {
      setError(t('login.fillAllFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(name, password);
    } catch (e: any) {
      setError(e.message || t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView containerClasses="justify-center">
      <View className="items-center mb-10">
        <View className="mb-6">
          <Logo width={120} height={120} />
        </View>
      </View>

      <Card className="border-0 shadow-none bg-transparent bg">
        <CardContent className="gap-2 px-0 space-y-4">
          {error ? (
            <View className="bg-destructive/10 p-3 rounded-md mb-2">
              <Text className="text-destructive text-sm font-medium text-center">
                {error}
              </Text>
            </View>
          ) : null}
          <Input
            label={t('login.username')}
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
          />
          <Input
            label={t('login.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Button
            className="mt-4"
            label={loading ? t('login.loggingIn') : t('login.loginToAccount')}
            onPress={handleLogin}
            disabled={loading}
          />
          <Button
            variant="outline"
            className="flex-row gap-2 mt-2"
            onPress={() => navigation.navigate('ServerConfiguration')}
          >
            <Settings size={18} color={colors.foreground} />
            <Text className="text-foreground font-medium">
              {t('login.serverConfig')}
            </Text>
          </Button>
        </CardContent>
      </Card>

      <View className="mt-8">
        <Text className="text-center text-xs text-muted-foreground">
          &copy; 2026 Grocy Lite. All rights reserved.
        </Text>
      </View>
    </SafeAreaView>
  );
}
