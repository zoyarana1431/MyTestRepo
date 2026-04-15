"use client";

import type { ModuleNode } from "@/types/api";

function TreeRows({
  nodes,
  depth,
  onDelete,
  isAdmin,
}: {
  nodes: ModuleNode[];
  depth: number;
  onDelete: (id: number) => void;
  isAdmin: boolean;
}) {
  return (
    <ul className={depth > 0 ? "ml-4 border-l border-border pl-3" : ""}>
      {nodes.map((n) => (
        <li key={n.id} className="py-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">{n.name}</span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onDelete(n.id)}
                className="text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Remove
              </button>
            )}
          </div>
          {n.children.length > 0 && (
            <TreeRows nodes={n.children} depth={depth + 1} onDelete={onDelete} isAdmin={isAdmin} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function ModuleTree({
  tree,
  onDelete,
  isAdmin,
}: {
  tree: ModuleNode[];
  onDelete: (id: number) => void;
  isAdmin: boolean;
}) {
  if (tree.length === 0) {
    return <p className="text-sm text-ink-muted">No modules yet. Add a top-level module or a sub-module.</p>;
  }
  return <TreeRows nodes={tree} depth={0} onDelete={onDelete} isAdmin={isAdmin} />;
}
