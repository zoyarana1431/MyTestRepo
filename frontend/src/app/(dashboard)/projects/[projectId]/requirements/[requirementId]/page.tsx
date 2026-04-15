"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { PRIORITY, REQUIREMENT_STATUS } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ModuleFlat, RequirementDetail, TestCaseListItem } from "@/types/api";

function parseTags(s: string): string[] | null {
  const t = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return t.length ? t : null;
}

export default function RequirementDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const requirementId = params.requirementId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);

  const [detail, setDetail] = useState<RequirementDetail | null>(null);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [allTestCases, setAllTestCases] = useState<TestCaseListItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("draft");
  const [sourceReference, setSourceReference] = useState("");
  const [tags, setTags] = useState("");
  const [selectedTc, setSelectedTc] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [d, mods, tcs] = await Promise.all([
      apiFetch<RequirementDetail>(`/api/v1/projects/${projectId}/requirements/${requirementId}`),
      apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`),
      apiFetch<TestCaseListItem[]>(`/api/v1/projects/${projectId}/test-cases`),
    ]);
    setDetail(d);
    setModules(mods);
    setAllTestCases(tcs);
    setTitle(d.title);
    setDescription(d.description ?? "");
    setModuleId(d.module_id != null ? String(d.module_id) : "");
    setPriority(d.priority);
    setStatus(d.status);
    setSourceReference(d.source_reference ?? "");
    setTags((d.tags ?? []).join(", "));
    setSelectedTc(new Set(d.test_cases.map((t) => t.id)));
  }, [projectId, requirementId]);

  useEffect(() => {
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [load]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !detail) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/requirements/${requirementId}`, {
        method: "PATCH",
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
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function saveLinks() {
    if (!isAdmin) return;
    setPending(true);
    setError(null);
    try {
      const d = await apiFetch<RequirementDetail>(
        `/api/v1/projects/${projectId}/requirements/${requirementId}/test-cases`,
        {
          method: "PUT",
          json: { test_case_ids: Array.from(selectedTc) },
        },
      );
      setDetail(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update links");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!isAdmin || !detail) return;
    if (!window.confirm(`Delete requirement ${detail.code}?`)) return;
    setPending(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/requirements/${requirementId}`, { method: "DELETE" });
      router.replace(`/projects/${projectId}/requirements`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setPending(false);
    }
  }

  function toggleTc(id: number) {
    setSelectedTc((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  if (loading || !detail) {
    return <p className="text-sm text-ink-muted">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <Link href={`/projects/${projectId}/requirements`} className="text-sm text-ink-muted hover:text-ink">
          ← Requirements
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h2 className="text-xl font-semibold text-ink">{detail.title}</h2>
          <span className="font-mono text-sm text-ink-muted">{detail.code}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={saveMeta} className="space-y-4 rounded-xl border border-border bg-surface-muted/20 p-6">
        <h3 className="text-sm font-semibold text-ink">Details</h3>
        <div>
          <label className="text-xs font-medium text-ink-muted">Title *</label>
          <input
            required
            disabled={!isAdmin || roleLoading}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Description</label>
          <textarea
            disabled={!isAdmin || roleLoading}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-muted">Module</label>
            <select
              disabled={!isAdmin || roleLoading}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
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
              disabled={!isAdmin || roleLoading}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-muted">Priority</label>
            <select
              disabled={!isAdmin || roleLoading}
              className="mt-1 w-full capitalize disabled:opacity-60"
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
              disabled={!isAdmin || roleLoading}
              className="mt-1 w-full disabled:opacity-60"
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
          <label className="text-xs font-medium text-ink-muted">Tags</label>
          <input
            disabled={!isAdmin || roleLoading}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        {isAdmin && !roleLoading && (
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Save details
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
            >
              Delete
            </button>
          </div>
        )}
      </form>

      <div className="rounded-xl border border-border bg-surface-muted/20 p-6">
        <h3 className="text-sm font-semibold text-ink">Linked test cases</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Select which test cases validate this requirement. You can also link from a test case detail page.
        </p>
        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-md border border-border bg-surface p-3">
          {allTestCases.length === 0 && <li className="text-sm text-ink-muted">No test cases in this project yet.</li>}
          {allTestCases.map((tc) => (
            <li key={tc.id} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedTc.has(tc.id)}
                disabled={!isAdmin || roleLoading}
                onChange={() => toggleTc(tc.id)}
              />
              <div>
                <span className="font-mono text-xs text-ink-muted">{tc.code}</span>
                <Link
                  href={`/projects/${projectId}/test-cases/${tc.id}`}
                  className="ml-2 font-medium text-accent hover:underline"
                >
                  {tc.feature_name || tc.test_scenario?.slice(0, 80) || "Untitled"}
                </Link>
                <span className="ml-2 text-xs capitalize text-ink-muted">{tc.status}</span>
              </div>
            </li>
          ))}
        </ul>
        {isAdmin && !roleLoading && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void saveLinks()}
            className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Save links
          </button>
        )}
      </div>
    </div>
  );
}
