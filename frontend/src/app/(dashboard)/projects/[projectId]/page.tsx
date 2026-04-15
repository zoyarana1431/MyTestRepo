"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Project } from "@/types/api";

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [releaseVersion, setReleaseVersion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const p = await apiFetch<Project>(`/api/v1/projects/${projectId}`);
    setProject(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setClientCompany(p.client_company ?? "");
    setReleaseVersion(p.release_version ?? "");
  }, [projectId]);

  useEffect(() => {
    void load().catch(() => setError("Failed to load project"));
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const p = await apiFetch<Project>(`/api/v1/projects/${projectId}`, {
        method: "PATCH",
        json: {
          name,
          description: description || null,
          client_company: clientCompany || null,
          release_version: releaseVersion || null,
        },
      });
      setProject(p);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function archive() {
    if (!isAdmin || !project) return;
    if (!window.confirm("Archive this project? You can restore it to active below.")) {
      return;
    }
    setPending(true);
    try {
      const p = await apiFetch<Project>(`/api/v1/projects/${projectId}`, {
        method: "PATCH",
        json: { status: "archived" },
      });
      setProject(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Archive failed");
    } finally {
      setPending(false);
    }
  }

  async function unarchive() {
    if (!isAdmin || !project) return;
    setPending(true);
    try {
      const p = await apiFetch<Project>(`/api/v1/projects/${projectId}`, {
        method: "PATCH",
        json: { status: "active" },
      });
      setProject(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Restore failed");
    } finally {
      setPending(false);
    }
  }

  if (!project) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-lg font-semibold text-ink">Workspace overview</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Requirements, test cases, and runs will live under this project. Modules organize work inside the workspace.
      </p>

      {!roleLoading && !isAdmin && (
        <p className="mt-6 rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-sm text-ink-muted">
          You have <strong className="text-ink">viewer</strong> access. Project details are read-only.
        </p>
      )}

      <form onSubmit={save} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">Project name</label>
          <input
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin || roleLoading}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isAdmin || roleLoading}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-muted">Client / company</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              disabled={!isAdmin || roleLoading}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Release / version</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
              value={releaseVersion}
              onChange={(e) => setReleaseVersion(e.target.value)}
              disabled={!isAdmin || roleLoading}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>}
        {isAdmin && !roleLoading && (
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            {project.status === "active" && (
              <button
                type="button"
                onClick={() => void archive()}
                disabled={pending}
                className="rounded-md border border-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-muted"
              >
                Archive project
              </button>
            )}
            {project.status === "archived" && (
              <button
                type="button"
                onClick={() => void unarchive()}
                disabled={pending}
                className="rounded-md border border-border px-4 py-2 text-sm text-ink hover:bg-surface-muted"
              >
                Restore to active
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
