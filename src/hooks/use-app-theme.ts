import { useColorScheme } from 'nativewind';
import { useColorScheme as useRNColorScheme, Appearance, AppState } from 'react-native';
import { useEffect, useState, useRef } from 'react';

export function useAppTheme() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const systemScheme = useRNColorScheme();
  const [appState, setAppState] = useState(AppState.currentState);
  
  // Track the last valid system theme to avoid flickers during AppState transitions
  const lastValidSystemTheme = useRef(Appearance.getColorScheme() || 'light');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    const appearanceSubscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
      if (newScheme) {
        lastValidSystemTheme.current = newScheme;
      }
    });

    return () => {
      subscription.remove();
      appearanceSubscription.remove();
    };
  }, []);

  // Update lastValidSystemTheme when systemScheme is valid
  if (systemScheme) {
    lastValidSystemTheme.current = systemScheme;
  }

  // Robust dark mode detection
  // 1. If explicit 'dark', it's dark.
  // 2. If 'system' or undefined, use systemScheme or lastValidSystemTheme.
  const isDark =
    (colorScheme as any) === 'dark' ||
    (((colorScheme as any) === 'system' || !colorScheme) &&
      (systemScheme === 'dark' || (appState !== 'active' && lastValidSystemTheme.current === 'dark') || Appearance.getColorScheme() === 'dark'));

  // Sticky isDark state to prevent flickering
  const [stickyIsDark, setStickyIsDark] = useState(isDark);

  useEffect(() => {
    setStickyIsDark(isDark);
  }, [isDark]);

  return {
    isDark: stickyIsDark,
    colorScheme,
    setColorScheme,
    systemScheme: systemScheme || lastValidSystemTheme.current,
  };
}

