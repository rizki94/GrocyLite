import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

interface ViewProps extends React.ComponentPropsWithoutRef<typeof View> {
  className?: string;
}

interface TextProps extends React.ComponentPropsWithoutRef<typeof Text> {
  className?: string;
}

function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-lg border border-border bg-card shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('p-6 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex flex-row items-center p-6 pt-0', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
