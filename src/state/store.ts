/**
 * src/state/store.ts
 *
 * Minimal reactive store — adapted from Claude Code's src/state/store.ts.
 * Pure TypeScript, no React dependency.
 *
 * Used by the agent runtime to track AppState (tasks, memory, permissions,
 * tool call history, onchain event subscriptions).
 */

type Listener = () => void;
type OnChange<T> = (args: { newState: T; oldState: T }) => void;

export type Store<T> = {
  getState: () => T;
  setState: (updater: (prev: T) => T) => void;
  subscribe: (listener: Listener) => () => void;
};

export function createStore<T>(
  initialState: T,
  onChange?: OnChange<T>,
): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,

    setState: (updater) => {
      const prev = state;
      const next = updater(prev);
      if (Object.is(next, prev)) return;
      state = next;
      onChange?.({ newState: next, oldState: prev });
      for (const listener of listeners) listener();
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
