"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { PRIORITY, REQUIREMENT_STATUS } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleFlat, Requirement } from "@/types/api";

function parseTags(s: string): string[] | null {
  const t = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return t.length ? t : null;
}

export default function NewRequirementPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [status, setStatus] = useState<string>("draft");
  const [sourceReference, setSourceReference] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`).then(setModules).catch(() => {});
  }, [projectId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError(null);
    setPending(true);
    try {
      const r = await apiFetch<Requirement>(`/api/v1/projects/${projectId}/requirements`, {
        method: "POST",
        json: {
          title: title.trim(),
          description: description.trim() || null,
          module_id: moduleId === "" ? null : Number(moduleId),
          priority,
          status,
          source_reference: sourceReference.trim() || null,
          tags: parseTags(tags),
        },
      });
      router.replace(`/projects/${projectId}/requirements/${r.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create");
    } finally {
      setPending(false);
    }
  }

  if (!roleLoading && !isAdmin) {
    return (
      <p className="text-sm text-ink-muted">
        <Link href={`/projects/${projectId}/requirements`} className="text-accent">
          Back
        </Link>{" "}
        — admin only.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/projects/${projectId}/requirements`} className="text-sm text-ink-muted hover:text-ink">
        ← Requirements
      </Link>
      <h2 className="mt-4 text-lg font-semibold text-ink">New requirement</h2>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">Title *</label>
          <input
            required
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-muted">Module</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
            >
              <option value="">— None —</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.id}] {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Source / reference</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-muted">Priority</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm capitalize"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Status</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {REQUIREMENT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Tags (comma-separated)</label>
          <input
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="smoke, checkout"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || !isAdmin}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create requirement"}
        </button>
      </form>
    </div>
  );
}
