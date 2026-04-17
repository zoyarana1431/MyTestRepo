"use client";

import { useEffect, useState } from "react";
import type { ModuleNode } from "@/types/api";

function IconFolder({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 8.2V18a2 2 0 002 2h14a2 2 0 002-2V8.2M3 8.2V6a2 2 0 012-2h5l2 2h8a2 2 0 012 2v2.2M3 8.2h18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function initialExpanded(nodes: ModuleNode[]): Record<number, boolean> {
  const m: Record<number, boolean> = {};
  function walk(ns: ModuleNode[]) {
    for (const n of ns) {
      if (n.children?.length) {
        m[n.id] = true;
        walk(n.children);
      }
    }
  }
  walk(nodes);
  return m;
}

function TreeRows({
  nodes,
  depth,
  expanded,
  toggle,
  onDelete,
  isAdmin,
}: {
  nodes: ModuleNode[];
  depth: number;
  expanded: Record<number, boolean>;
  toggle: (id: number) => void;
  onDelete: (id: number) => void;
  isAdmin: boolean;
}) {
  return (
    <ul className={depth > 0 ? "ml-6 border-l border-slate-200 pl-4" : "space-y-1"}>
      {nodes.map((n) => {
        const hasChildren = n.children.length > 0;
        const isOpen = expanded[n.id] ?? false;
        return (
          <li key={n.id} className="py-1">
            <div className="flex gap-2 rounded-lg border border-transparent px-1 py-1.5 hover:border-slate-100 hover:bg-slate-50/80">
              <div className="flex min-w-0 flex-1 gap-2">
                <div className="flex w-7 shrink-0 justify-center pt-0.5">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggle(n.id)}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                        aria-hidden
                      >
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : (
                    <span className="block h-7 w-7" aria-hidden />
                  )}
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                  <IconFolder className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className={`text-sm font-semibold ${depth > 0 ? "text-slate-800" : "text-slate-900"}`}>
                      {n.name}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDelete(n.id)}
                        className="shrink-0 text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {n.description ? (
                    <p className="mt-0.5 text-sm leading-snug text-slate-500">{n.description}</p>
                  ) : null}
                </div>
              </div>
            </div>
            {hasChildren && isOpen && (
              <TreeRows
                nodes={n.children}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
                onDelete={onDelete}
                isAdmin={isAdmin}
              />
            )}
          </li>
        );
      })}
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
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setExpanded(initialExpanded(tree));
  }, [tree]);

  function toggle(id: number) {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  }

  if (tree.length === 0) {
    return <p className="text-sm text-slate-500">No modules yet. Create a module to get started.</p>;
  }
  return <TreeRows nodes={tree} depth={0} expanded={expanded} toggle={toggle} onDelete={onDelete} isAdmin={isAdmin} />;
}
