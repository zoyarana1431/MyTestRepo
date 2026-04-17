"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Project, ProjectListItem } from "@/types/api";

type StatusFilter = "all" | "active" | "on_hold" | "completed" | "archived";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

function statusPresentation(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return { label: "Active", pill: "bg-emerald-50 text-emerald-800 ring-emerald-100", dot: "bg-emerald-500" };
  if (s === "on_hold") return { label: "On Hold", pill: "bg-amber-50 text-amber-900 ring-amber-100", dot: "bg-amber-500" };
  if (s === "completed") return { label: "Completed", pill: "bg-emerald-50 text-emerald-800 ring-emerald-100", dot: "bg-emerald-600" };
  if (s === "archived") return { label: "Archived", pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" };
  return { label: status, pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" };
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

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

function ProjectWorkspaceCard({
  project,
  onDeleted,
}: {
  project: ProjectListItem;
  onDeleted: () => void;
}) {
  const { isAdmin, loading } = useProjectRole(String(project.id));
  const st = statusPresentation(project.status);

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;
    if (
      !window.confirm(
        "Delete this project permanently? All modules, requirements, test cases, and related data will be removed.",
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/api/v1/projects/${project.id}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Could not delete project");
    }
  }

  return (
    <article className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <IconFolder />
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${st.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
          {!loading && isAdmin && (
            <button
              type="button"
              onClick={(e) => void remove(e)}
              className="rounded-md p-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Delete project"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 inline-flex w-fit rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">
        {project.code}
      </p>
      <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-900">{project.name}</h2>
      {project.client_company && <p className="text-sm text-slate-500">{project.client_company}</p>}
      {project.description && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{project.description}</p>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
        <div>
          <p className="text-lg font-bold tabular-nums text-slate-900">{project.test_cases_count}</p>
          <p className="text-xs text-slate-500">Test Cases</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-emerald-600">{project.pass_rate_pct}%</p>
          <p className="text-xs text-slate-500">Pass Rate</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-red-600">{project.open_defects_count}</p>
          <p className="text-xs text-slate-500">Open Bugs</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
          Version: {project.release_version?.trim() ? project.release_version : "—"}
        </span>
        <span>{formatShortDate(project.created_at)}</span>
      </div>
      <Link
        href={`/projects/${project.id}`}
        className="mt-3 text-right text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        Open Project →
      </Link>
    </article>
  );
}

function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [releaseVersion, setReleaseVersion] = useState("");
  const [projStatus, setProjStatus] = useState<string>("active");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        client_company: clientCompany.trim() || null,
        release_version: releaseVersion.trim() || null,
        status: projStatus,
      };
      const c = code.trim();
      if (c) payload.code = c.toUpperCase();

      const p = await apiFetch<Project>("/api/v1/projects", {
        method: "POST",
        json: payload,
      });
      setName("");
      setCode("");
      setDescription("");
      setClientCompany("");
      setReleaseVersion("");
      setProjStatus("active");
      onCreated(p);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project");
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
        aria-labelledby="create-project-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="create-project-title" className="text-lg font-semibold text-slate-900">
            Create New Project
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder="My Project"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/30 focus:ring-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Project Code</label>
              <input
                placeholder="PRJ-001"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/30 focus:ring-2"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Leave empty to assign the next code automatically.</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              placeholder="Project description…"
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/30 focus:ring-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Client / Company</label>
              <input
                placeholder="Client Name"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/30 focus:ring-2"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Release Version</label>
              <input
                placeholder="v1.0.0"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/30 focus:ring-2"
                value={releaseVersion}
                onChange={(e) => setReleaseVersion(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Status</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/30 focus:ring-2"
              value={projStatus}
              onChange={(e) => setProjStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiFetch<ProjectListItem[]>("/api/v1/projects");
      setProjects(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setModalOpen(true);
      router.replace("/projects", { scroll: false });
    }
  }, [searchParams, router]);

  const filtered = useMemo(() => {
    if (filter === "all") return projects;
    return projects.filter((p) => p.status.toLowerCase() === filter);
  }, [projects, filter]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">{projects.length} projects total</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading && <p className="mt-10 text-sm text-slate-500">Loading…</p>}
      {error && <p className="mt-10 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectWorkspaceCard key={p.id} project={p} onDeleted={() => void load()} />
          ))}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/30"
          >
            <span className="text-3xl font-light text-blue-600">+</span>
            <span className="mt-2 text-sm font-semibold text-blue-600">Create New Project</span>
          </button>
        </div>
      )}

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(p) => {
          void load();
          router.push(`/projects/${p.id}`);
        }}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <ProjectsPageInner />
    </Suspense>
  );
}
