'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col gap-2',
        month: 'flex flex-col gap-3',
        month_caption: 'flex justify-center relative items-center text-xs font-medium',
        nav: 'flex items-center gap-1 absolute inset-x-2 top-0 z-10 justify-between',
        button_previous: 'size-7 inline-flex items-center justify-center rounded-md opacity-50 hover:opacity-100 cursor-pointer',
        button_next: 'size-7 inline-flex items-center justify-center rounded-md opacity-50 hover:opacity-100 cursor-pointer',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground w-8 font-normal text-[11px]',
        week: 'flex w-full mt-1',
        day: 'relative p-0 text-center text-xs [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md',
        day_button: 'size-8 p-0 font-normal cursor-pointer rounded-md transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100',
        selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-md',
        today: 'bg-accent text-accent-foreground',
        outside: 'text-muted-foreground/30',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
