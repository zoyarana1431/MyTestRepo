"use client";

import { useEffect, useMemo, useState } from "react";
import type { ModuleFlat } from "@/types/api";

function sortModules(list: ModuleFlat[]): ModuleFlat[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

/** Walk up to the top-level module (parent_id == null). */
export function findRootModule(m: ModuleFlat, modules: ModuleFlat[]): ModuleFlat {
  let cur = m;
  const byId = new Map(modules.map((x) => [x.id, x]));
  while (cur.parent_id != null) {
    const p = byId.get(cur.parent_id);
    if (!p) break;
    cur = p;
  }
  return cur;
}

/** All descendants of `rootId` (not including the root), with "Name / Name / …" labels. */
export function collectDescendantsWithPaths(
  rootId: number,
  modules: ModuleFlat[],
): { id: number; label: string }[] {
  const byParent = new Map<number | null, ModuleFlat[]>();
  for (const m of modules) {
    const k = m.parent_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(m);
  }
  for (const lst of Array.from(byParent.values())) {
    lst.sort((a: ModuleFlat, b: ModuleFlat) => a.sort_order - b.sort_order || a.id - b.id);
  }
  const out: { id: number; label: string }[] = [];
  function walk(parentId: number, pathParts: string[]) {
    for (const m of byParent.get(parentId) ?? []) {
      const parts = [...pathParts, m.name];
      out.push({ id: m.id, label: parts.join(" / ") });
      walk(m.id, parts);
    }
  }
  walk(rootId, []);
  return out;
}

const defaultSelectClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const filterSelectClass =
  "mt-1.5 w-full min-w-[10rem] rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60";

type Props = {
  modules: ModuleFlat[];
  value: number | null;
  onChange: (moduleId: number | null) => void;
  disabled?: boolean;
  /** Use slightly different labels (e.g. filter bar). */
  variant?: "form" | "filter";
  /** Override select styling to match host (e.g. modal `inputClass`). */
  selectClassName?: string;
  /** Override label styling (e.g. `text-xs text-ink-muted`). */
  labelClassName?: string;
  className?: string;
};

/**
 * Top dropdown: root modules only. Second dropdown: sub-modules under the selected root
 * (any depth), or "use parent module only" to assign the root id.
 */
export function ModuleSubmoduleSelect({
  modules,
  value,
  onChange,
  disabled,
  variant = "form",
  selectClassName,
  labelClassName,
  className,
}: Props) {
  const selectCls =
    selectClassName ?? (variant === "filter" ? filterSelectClass : defaultSelectClass);
  const roots = useMemo(
    () => sortModules(modules.filter((m) => m.parent_id == null)),
    [modules],
  );

  const [rootIdStr, setRootIdStr] = useState("");
  const [leafIdStr, setLeafIdStr] = useState("");

  useEffect(() => {
    if (value == null) {
      setRootIdStr("");
      setLeafIdStr("");
      return;
    }
    const m = modules.find((x) => x.id === value);
    if (!m) {
      setRootIdStr("");
      setLeafIdStr("");
      return;
    }
    const root = findRootModule(m, modules);
    setRootIdStr(String(root.id));
    setLeafIdStr(value === root.id ? "" : String(value));
  }, [value, modules]);

  const descendantOpts = useMemo(() => {
    if (!rootIdStr) return [];
    const rid = Number(rootIdStr);
    if (Number.isNaN(rid)) return [];
    return collectDescendantsWithPaths(rid, modules);
  }, [rootIdStr, modules]);

  const noneLabel =
    variant === "filter"
      ? "All modules"
      : "No module";
  const parentLabel = "Module";
  const subLabel = "Sub-module";
  const useRootOnlyLabel =
    variant === "filter" ? "— (top-level only)" : "— Use parent module only";

  const labelCls =
    labelClassName ??
    (variant === "filter" ? "text-xs font-medium text-ink-muted" : "text-sm font-medium text-slate-800");

  return (
    <div className={`${variant === "filter" ? "space-y-2" : "space-y-4"} ${className ?? ""}`}>
      <div>
        <label className={labelCls}>{parentLabel}</label>
        <select
          className={selectCls}
          disabled={disabled}
          value={rootIdStr}
          onChange={(e) => {
            const r = e.target.value;
            setRootIdStr(r);
            setLeafIdStr("");
            if (!r) onChange(null);
            else onChange(Number(r));
          }}
        >
          <option value="">{noneLabel}</option>
          {roots.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>{subLabel}</label>
        <select
          className={selectCls}
          disabled={disabled || !rootIdStr}
          value={leafIdStr}
          onChange={(e) => {
            const v = e.target.value;
            setLeafIdStr(v);
            if (!rootIdStr) return;
            if (!v) onChange(Number(rootIdStr));
            else onChange(Number(v));
          }}
        >
          <option value="">{useRootOnlyLabel}</option>
          {descendantOpts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
