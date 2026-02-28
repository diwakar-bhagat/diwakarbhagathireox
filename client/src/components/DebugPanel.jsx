import React from "react";

function DebugPanel({ title = "Debug", items = {} }) {
  const entries = Object.entries(items);
  if (!entries.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
      <div className="mb-2 font-semibold uppercase tracking-wide">{title}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
        {entries.map(([key, value]) => (
          <div key={key} className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-amber-700">{key}</div>
            <div className="truncate font-medium">{String(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DebugPanel;
