import React from 'react';
import {
  TouchableOpacity,
  Text,
  type TouchableOpacityProps,
} from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-md px-4 py-2 active:opacity-80',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        destructive: 'bg-destructive',
        outline: 'border border-input bg-background',
        secondary: 'bg-secondary',
        ghost: 'bg-transparent',
        link: 'bg-transparent underline',
      },
      size: {
        default: 'h-12 px-5',
        sm: 'h-9 px-3',
        lg: 'h-14 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const buttonTextVariants = cva('text-sm font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      link: 'text-primary underline',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface ButtonProps
  extends TouchableOpacityProps, VariantProps<typeof buttonVariants> {
  label?: string;
  labelClasses?: string;
  children?: React.ReactNode;
  className?: string;
}

function Button({
  className,
  variant,
  size,
  label,
  labelClasses,
  children,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={cn(buttonVariants({ variant, size, className }))}
      activeOpacity={0.7}
      {...props}
    >
      {label ? (
        <Text
          className={cn(
            buttonTextVariants({ variant, className: labelClasses }),
          )}
        >
          {label}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

export { Button, buttonVariants };
