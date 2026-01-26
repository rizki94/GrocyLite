6# Icon Color Fix Guide

## Problem

Lucide React Native icons don't support `className` prop - they need `color` prop with actual color values.

## Solution Pattern

### 1. Import the hook

```tsx
import { useThemeColor } from '../../lib/colors';
```

### 2. Use the hook in component

```tsx
function MyScreen() {
  const colors = useThemeColor();
  // ... rest of component
}
```

### 3. Replace className with color prop

**Before (WRONG):**

```tsx
<TrendingUp size={20} className="text-primary" />
<Package size={20} className="text-amber-600 dark:text-amber-400" />
<Moon size={18} className="text-blue-600 dark:text-blue-400" />
<ChevronRight size={16} className="text-muted-foreground" />
```

**After (CORRECT):**

```tsx
<TrendingUp size={20} color={colors.primary} />
<Package size={20} color={colors.amber} />
<Moon size={18} color={colors.blue} />
<ChevronRight size={16} color={colors.mutedForeground} />
```

## Available Colors from useThemeColor()

- `colors.primary` - Main brand color
- `colors.primaryForeground` - Text on primary background
- `colors.foreground` - Main text color
- `colors.mutedForeground` - Secondary text color
- `colors.destructive` - Error/delete color
- `colors.border` - Border color
- `colors.amber` - Amber accent
- `colors.blue` - Blue accent
- `colors.indigo` - Indigo accent
- `colors.orange` - Orange accent
- `colors.green` - Green accent
- `colors.red` - Red accent

## Files That Need Fixing

### Priority 1 (Main Screens):

- [x] src/components/layout/app-layout.tsx - DONE
- [x] src/screens/main/home-screen.tsx - DONE
- [x] src/screens/main/settings-screen.tsx - DONE
- [x] src/screens/main/products-screen.tsx - DONE
- [x] src/screens/main/warehouse-screen.tsx - DONE

### Priority 2 (Secondary Screens):

- [x] src/screens/sales/sales-return-screen.tsx - DONE
- [x] src/screens/sales/sales-approve-screen.tsx - DONE
- [x] src/screens/sales/sales-report-screen.tsx - DONE
- [x] src/screens/sales/profit-screen.tsx - DONE
- [x] src/screens/sales/cancel-transaction-screen.tsx - DONE
- [x] src/screens/sales/approve-detail-screen.tsx - DONE
- [x] src/screens/purchase/purchase-screen.tsx - DONE
- [x] src/screens/payment/credit-payments-screen.tsx - DONE
- [x] src/screens/payment/debt-payments-screen.tsx - DONE

### Priority 3 (Other):

- [x] src/screens/auth/login-screen.tsx - DONE
- [x] src/screens/main/sales-screen.tsx - DONE
- [x] src/screens/main/stock-opname-screen.tsx - DONE
- [x] src/components/ui/date-picker.tsx - DONE
- [x] src/components/ui/input.tsx (if has icons) - DONE

## Special Cases

### White/Black colors

For icons that should always be white or black regardless of theme:

```tsx
<Plus size={24} color="#ffffff" />  // Always white
<Icon size={20} color="#000000" />  // Always black
```

### Icons in Input components

```tsx
// Before
leftIcon={<Search size={16} className="text-muted-foreground" />}

// After
const colors = useThemeColor();
leftIcon={<Search size={16} color={colors.mutedForeground} />}
```
