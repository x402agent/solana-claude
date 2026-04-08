/**
 * Reusable CLI spinner built on $CLAWD + unicode-animations frames.
 *
 * Usage:
 *   const s = createClawdSpinner('Deploying to Solana...', 'solanaPulse')
 *   await deploy()
 *   s.stop('Deployed.')
 */

import spinners from 'unicode-animations'
import { CLAWD_SPINNERS, type ClawdSpinnerName } from './clawd-frames.js'

export interface ClawdSpinner {
  update(msg: string): void
  stop(msg: string): void
}

type AnySpinnerName = ClawdSpinnerName | keyof typeof spinners

function resolveSpinner(name: AnySpinnerName) {
  if (name in CLAWD_SPINNERS) {
    return CLAWD_SPINNERS[name as ClawdSpinnerName]
  }
  return (spinners as Record<string, { frames: string[]; interval: number }>)[name]!
}

export function createClawdSpinner(
  msg: string,
  name: AnySpinnerName = 'solanaPulse',
): ClawdSpinner {
  const { frames, interval } = resolveSpinner(name)
  let i = 0
  let text = msg

  const timer = setInterval(() => {
    const frame = frames[i++ % frames.length]
    process.stdout.write(`\r\x1B[2K  ${frame} ${text}`)
  }, interval)

  return {
    update(m: string) {
      text = m
    },
    stop(m: string) {
      clearInterval(timer)
      process.stdout.write(`\r\x1B[2K  \x1b[32m✔\x1b[0m ${m}\n`)
    },
  }
}

/**
 * Run an async function with a spinner. Returns the function's result.
 */
export async function withSpinner<T>(
  label: string,
  fn: () => Promise<T>,
  name: AnySpinnerName = 'solanaPulse',
): Promise<T> {
  const s = createClawdSpinner(label, name)
  try {
    const result = await fn()
    s.stop(label)
    return result
  } catch (err) {
    s.stop(`\x1b[31m✗\x1b[0m ${label}`)
    throw err
  }
}
