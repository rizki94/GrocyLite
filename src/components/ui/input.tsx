import React from 'react';
import { TextInput, View, Text, type TextInputProps } from 'react-native';
import { cn } from '../../lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<TextInput, InputProps>(({
  className,
  label,
  error,
  leftIcon,
  rightIcon,
  multiline,
  ...props
}, ref) => {
  return (
    <View className="flex flex-col gap-2 space-y-2 w-full">
      {label && (
        <Text className="text-sm font-medium leading-none text-foreground mb-1">
          {label}
        </Text>
      )}
      <View className="relative w-full">
        {leftIcon && (
          <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
            {leftIcon}
          </View>
        )}
        <TextInput
          ref={ref}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground active:border-primary',
            !multiline && 'h-12',
            leftIcon && 'pl-12',
            rightIcon && 'pr-12',
            error && 'border-destructive',
            className,
          ) || ''}
          placeholderTextColor="#a1a1aa"
          {...props}
        />
        {rightIcon && (
          <View className="absolute right-3 top-0 bottom-0 justify-center z-10">
            {rightIcon}
          </View>
        )}
      </View>
      {error && (
        <Text className="text-xs font-medium text-destructive mt-1">
          {error}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

export { Input };
