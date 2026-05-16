import React, { useState } from 'react'
import { ClawdOrchestrationResponse, fetchClawdOrchestration } from '../lib/backroom'

export default function ClawdOrchestrationPanel() {
  const [task, setTask] = useState('harden the backroom deployment and verify perps data')
  const [result, setResult] = useState<ClawdOrchestrationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    const trimmed = task.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)
    try {
      setResult(await fetchClawdOrchestration(trimmed, 4))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CLAWD orchestration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="clawd-orchestrator">
      <div className="clawd-orch-title">CLAWD Orchestration Loop</div>
      <div className="clawd-orch-subtitle">Ralph pattern · renamed for the backroom · bounded planner</div>
      <div className="clawd-orch-input-row">
        <input
          value={task}
          onChange={(event) => setTask(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && run()}
          placeholder="what should CLAWD orchestrate?"
        />
        <button onClick={run} disabled={loading || !task.trim()}>{loading ? '...' : 'run'}</button>
      </div>
      {error && <div className="clawd-orch-error">{error}</div>}
      {result && (
        <>
          <div className="clawd-orch-meta">
            <span>{result.risk.toUpperCase()} RISK</span>
            <span>{result.mode}</span>
            <span>{result.loops} loops</span>
          </div>
          <div className="clawd-orch-trace">
            {result.trace.map((step) => (
              <div className="clawd-orch-step" key={step.iteration}>
                <div className="clawd-orch-step-head">
                  <span>#{step.iteration} {step.phase}</span>
                  <span>{step.agent}</span>
                </div>
                <div className="clawd-orch-step-output">{step.output}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
