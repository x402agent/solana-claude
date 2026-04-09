"use client";

const FILE_SURFACES = [
  "web/app",
  "web/components",
  "web/lib",
  "MCP/src",
  "gateway/src",
  "tailclawd/",
];

export function FileExplorer() {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4">
        <div className="text-sm font-medium text-surface-100">Workspace Surface</div>
        <p className="mt-2 text-sm leading-6 text-surface-400">
          The repo-aware file tree UI was missing from this web build. This fallback keeps the
          shell usable and points users at the primary product surfaces.
        </p>
        <div className="mt-4 space-y-2 font-mono text-xs text-surface-300">
          {FILE_SURFACES.map((path) => (
            <div
              key={path}
              className="rounded-lg border border-surface-800 bg-surface-950/80 px-3 py-2"
            >
              {path}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
