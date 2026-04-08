import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

import '../src/shims/preload.ts'

const here = dirname(fileURLToPath(import.meta.url))

Bun.plugin({
  name: 'solana-clawd-bun-shims',
  setup(build) {
    build.onResolve({ filter: /^bun:bundle$/ }, () => ({
      path: resolve(here, '../src/shims/bun-bundle.ts'),
    }))
  },
})
