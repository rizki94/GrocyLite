import { useColorScheme } from 'nativewind';

// Theme colors that match global.css
export const colors = {
  light: {
    background: '#fcfcfc',
    card: '#fcfcfc',
    primary: '#5dd4bf',
    primaryForeground: '#2f4946',
    secondary: '#fefefe',
    foreground: '#2b2b30',
    mutedForeground: '#333337',
    destructive: '#d14343',
    border: '#e3e3e5',
    // Accent colors
    amber: '#d97706',
    blue: '#2563eb',
    indigo: '#4f46e5',
    orange: '#ea580c',
    green: '#16a34a',
    red: '#dc2626',
  },
  dark: {
    background: '#1b1b1f',
    card: '#2b2b30',
    primary: '#00a991',
    primaryForeground: '#e0f5f1',
    secondary: '#363639',
    foreground: '#e5e1e6',
    mutedForeground: '#b0b0b4',
    destructive: '#6b2c2c',
    border: '#3d3d41',
    // Accent colors
    amber: '#fbbf24',
    blue: '#60a5fa',
    indigo: '#818cf8',
    orange: '#fb923c',
    green: '#4ade80',
    red: '#f87171',
  },
};

export function useThemeColor() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    background: isDark ? colors.dark.background : colors.light.background,
    card: isDark ? colors.dark.card : colors.light.card,
    primary: isDark ? colors.dark.primary : colors.light.primary,
    primaryForeground: isDark
      ? colors.dark.primaryForeground
      : colors.light.primaryForeground,
    secondary: isDark ? colors.dark.secondary : colors.light.secondary,
    foreground: isDark ? colors.dark.foreground : colors.light.foreground,
    mutedForeground: isDark
      ? colors.dark.mutedForeground
      : colors.light.mutedForeground,
    destructive: isDark ? colors.dark.destructive : colors.light.destructive,
    border: isDark ? colors.dark.border : colors.light.border,
    amber: isDark ? colors.dark.amber : colors.light.amber,
    blue: isDark ? colors.dark.blue : colors.light.blue,
    indigo: isDark ? colors.dark.indigo : colors.light.indigo,
    orange: isDark ? colors.dark.orange : colors.light.orange,
    green: isDark ? colors.dark.green : colors.light.green,
    red: isDark ? colors.dark.red : colors.light.red,
  };
}
