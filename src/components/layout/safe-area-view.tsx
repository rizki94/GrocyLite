import React from 'react';
import { SafeAreaView as RNSafeAreaView, View } from 'react-native';
import { cn } from '../../lib/utils';

interface SafeAreaViewProps
  extends React.ComponentPropsWithoutRef<typeof RNSafeAreaView> {
  containerClasses?: string;
  children?: React.ReactNode;
}

export function SafeAreaView({
  className,
  containerClasses,
  children,
  ...props
}: SafeAreaViewProps) {
  return (
    <RNSafeAreaView
      className={cn('flex-1 bg-background', className)}
      {...props}
    >
      <View className={cn('flex-1 px-4', containerClasses)}>{children}</View>
    </RNSafeAreaView>
  );
}
