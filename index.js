import 'react-native-gesture-handler';
import { Appearance, NativeModules, Platform } from 'react-native';

// Defensive patch for Android bridge crash when resetting theme
if (Platform.OS === 'android') {
  const AppearanceModule = NativeModules.AppearanceModule;

  // Patch Global Appearance
  const originalSet = Appearance.setColorScheme;
  if (typeof originalSet === 'function') {
    Appearance.setColorScheme = scheme => {
      if (scheme === null || scheme === undefined || scheme === 'system') {
        try {
          return originalSet('unspecified');
        } catch (e) {
          return;
        }
      }
      return originalSet(scheme);
    };
  }

  // Patch Native Module directly
  if (
    AppearanceModule &&
    typeof AppearanceModule.setColorScheme === 'function'
  ) {
    const nativeSet = AppearanceModule.setColorScheme;
    AppearanceModule.setColorScheme = style => {
      if (style === null || style === undefined || style === 'system') {
        try {
          return nativeSet('unspecified');
        } catch (e) {
          return;
        }
      }
      return nativeSet(style);
    };
  }
}

import './global.css';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
