'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fgAccent1 focus-visible:ring-offset-2 focus-visible:ring-offset-bg1',
      'peer h-4 w-4 shrink-0 rounded border border-separator2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:text-fg1',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center', 'text-fgAccent1', 'h-full w-full')}
    >
      <CheckIcon className="h-[14px] w-[14px]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
