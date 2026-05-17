import { SendHorizontal } from "lucide-react";
import type { DashboardState } from "../types";

interface InferencePageProps {
  state: DashboardState;
}

export function InferencePage({ state }: InferencePageProps) {
  return (
    <section className="page-grid inference-layout">
      <article className="card control-card">
        <div className="section-header">
          <div>
            <h2>Inference Controls</h2>
            <p>Model selection, lobster-safe prompting, and throughput defaults for trench automation.</p>
          </div>
        </div>

        <label className="field">
          <span>Model</span>
          <select defaultValue={state.inference.models[0].name}>
            {state.inference.models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
          <small>{state.inference.models[0].inputPrice}, {state.inference.models[0].outputPrice}</small>
        </label>

        <label className="field">
          <span>System Prompt</span>
          <textarea defaultValue={state.inference.defaultSystemPrompt} rows={6} />
        </label>

        <label className="field">
          <span>Temperature</span>
          <input type="range" min="0" max="2" step="0.1" defaultValue="0.8" />
        </label>

        <label className="field">
          <span>Max Tokens</span>
          <input type="number" defaultValue="4096" />
        </label>

        <label className="toggle">
          <span>Stream output</span>
          <input type="checkbox" defaultChecked />
        </label>
      </article>

      <article className="card chat-card">
        <div className="chat-card__empty">
          <div className="chat-card__glyph">🦞</div>
          <h2>Send a message to start a trench conversation</h2>
          <p>{state.inference.models.length} models available, routed through the CLAWD automation fabric.</p>
        </div>
        <div className="chat-card__composer">
          <input
            type="text"
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          />
          <button className="primary-icon-button" type="button">
            <SendHorizontal size={18} />
          </button>
        </div>
      </article>
    </section>
  );
}
