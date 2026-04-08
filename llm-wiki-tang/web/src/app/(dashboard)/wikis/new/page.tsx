'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useKBStore } from '@/stores'
import { Loader2 } from 'lucide-react'

export default function NewKnowledgeBasePage() {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const router = useRouter()
  const createKB = useKBStore((s) => s.createKB)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')

    try {
      const kb = await createKB(trimmed, description.trim() || undefined)
      router.push(`/wikis/${kb.slug}`)
    } catch (err) {
      setError((err as Error).message || 'Failed to create vault')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-semibold tracking-tight">Create Vault</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A vault is an LLM-maintained Solana knowledge base compiled from your raw sources.
      </p>

      <form onSubmit={handleCreate} className="mt-6 space-y-4">
        <div>
          <label htmlFor="kb-name" className="block text-sm font-medium mb-1.5">
            Name
          </label>
          <input
            id="kb-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            placeholder="Wallet Flow Watchlist"
            required
          />
        </div>

        <div>
          <label htmlFor="kb-description" className="block text-sm font-medium mb-1.5">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="kb-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background resize-none"
            placeholder="Notes and papers about..."
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Creating...
            </>
          ) : (
            'Create'
          )}
        </button>
      </form>
    </div>
  )
}
