import * as React from 'react'
import { cn } from '@/lib/utils'

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] font-medium leading-none text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
