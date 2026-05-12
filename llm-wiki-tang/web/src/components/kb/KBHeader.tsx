'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { UserMenu } from '@/components/layout/UserMenu'

type Props = {
  kbName: string
}

export function KBHeader({ kbName }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => router.push('/wikis')}
        className="p-1 rounded transition-colors hover:bg-accent cursor-pointer text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-sm font-medium">{kbName}</span>
      <div className="ml-auto">
        <UserMenu />
      </div>
    </div>
  )
}
