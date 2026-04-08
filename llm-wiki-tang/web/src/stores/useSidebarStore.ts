import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SidebarState = {
  expanded: boolean
  toggle: () => void
  set: (v: boolean) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      expanded: true,
      toggle: () => set({ expanded: !get().expanded }),
      set: (v) => set({ expanded: v }),
    }),
    {
      name: 'llmwiki:sidebar',
    },
  ),
)
