"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { EXECUTION_CYCLE_STATUS } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import type { ExecutionCycle } from "@/types/api";

export default function EditRunPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const cycleId = params.cycleId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);
  const [name, setName] = useState("");
  const [buildVersion, setBuildVersion] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planned");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const c = await apiFetch<ExecutionCycle>(`/api/v1/projects/${projectId}/execution-cycles/${cycleId}`);
    setName(c.name);
    setBuildVersion(c.build_version ?? "");
    setDescription(c.description ?? "");
    setStatus(c.status);
  }, [projectId, cycleId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch<ExecutionCycle>(`/api/v1/projects/${projectId}/execution-cycles/${cycleId}`, {
        method: "PATCH",
        json: {
          name: name.trim(),
          build_version: buildVersion.trim() || null,
          description: description.trim() || null,
          status,
        },
      });
      router.replace(`/projects/${projectId}/runs`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  if (!roleLoading && !isAdmin) {
    return (
      <p className="text-sm text-ink-muted">
        <Link href={`/projects/${projectId}/runs`} className="text-accent">
          Back
        </Link>{" "}
        — admin only.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/projects/${projectId}/runs`} className="text-sm text-ink-muted hover:text-ink">
        ← Runs
      </Link>
      <h2 className="mt-4 text-lg font-semibold text-ink">Edit execution cycle</h2>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">Name *</label>
          <input
            required
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Build version</label>
          <input
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={buildVersion}
            onChange={(e) => setBuildVersion(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Status</label>
          <select
            className="mt-1 w-full capitalize"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {EXECUTION_CYCLE_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
