"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { ModuleNode } from "@/types/api";

function flattenParentOptions(nodes: ModuleNode[], depth = 0): { id: number; label: string }[] {
  const out: { id: number; label: string }[] = [];
  for (const n of nodes) {
    const prefix = depth > 0 ? `${"\u2014".repeat(Math.min(depth, 3))} ` : "";
    out.push({ id: n.id, label: `${prefix}${n.name}` });
    if (n.children?.length) out.push(...flattenParentOptions(n.children, depth + 1));
  }
  return out;
}

export function CreateModuleModal({
  open,
  onClose,
  projectId,
  tree,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  tree: ModuleNode[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const parentOptions = useMemo(() => flattenParentOptions(tree), [tree]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setError(null);
      setPending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setParentId("");
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/modules`, {
        method: "POST",
        json: {
          name: name.trim(),
          description: description.trim() || null,
          parent_id: parentId === "" ? null : Number(parentId),
          sort_order: 0,
        },
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create module");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-module-title"
        className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="create-module-title" className="text-lg font-semibold text-slate-900">
            Create Module
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="px-6 py-5">
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="space-y-4">
            <div>
              <label htmlFor="cm-name" className="text-sm font-medium text-slate-800">
                Module Name <span className="text-red-500">*</span>
              </label>
              <input
                id="cm-name"
                required
                className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Authentication"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="cm-desc" className="text-sm font-medium text-slate-800">
                Description
              </label>
              <textarea
                id="cm-desc"
                rows={3}
                className="mt-1.5 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Module description..."
              />
            </div>
            <div>
              <label htmlFor="cm-parent" className="text-sm font-medium text-slate-800">
                Parent Module
              </label>
              <select
                id="cm-parent"
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">None (Top-level)</option>
                {parentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">Leave empty to create a top-level module</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create Module"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
