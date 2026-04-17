"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConicDonut } from "@/components/charts/conic-donut";
import { apiFetch, ApiError } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { DashboardSummary, ExecutionCycle, ModuleFlat, Project } from "@/types/api";

const COL = {
  pass: "#10B981",
  fail: "#EF4444",
  blocked: "#F59E0B",
  not_run: "#94A3B8",
  retest: "#A855F7",
};

function statusPresentation(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return { label: "Active", pill: "bg-emerald-50 text-emerald-800 ring-emerald-100", dot: "bg-emerald-500" };
  if (s === "on_hold") return { label: "On Hold", pill: "bg-amber-50 text-amber-900 ring-amber-100", dot: "bg-amber-500" };
  if (s === "completed") return { label: "Completed", pill: "bg-emerald-50 text-emerald-800 ring-emerald-100", dot: "bg-emerald-600" };
  if (s === "archived") return { label: "Archived", pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" };
  return { label: status, pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" };
}

function cycleStatusPresentation(status: string) {
  const s = status.toLowerCase();
  if (s === "closed")
    return { label: "Completed", pill: "bg-emerald-50 text-emerald-800 ring-emerald-100", dot: "bg-emerald-500" };
  if (s === "active")
    return { label: "In Progress", pill: "bg-amber-50 text-amber-900 ring-amber-100", dot: "bg-amber-500" };
  if (s === "planned") return { label: "Planned", pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" };
  return { label: status, pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const base = `/projects/${projectId}`;
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [dash, setDash] = useState<DashboardSummary | null>(null);
  const [cycles, setCycles] = useState<ExecutionCycle[]>([]);
  const [cycleTotal, setCycleTotal] = useState(0);
  const [moduleCount, setModuleCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [releaseVersion, setReleaseVersion] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, c, mods] = await Promise.all([
        apiFetch<Project>(`/api/v1/projects/${projectId}`),
        apiFetch<DashboardSummary>(`/api/v1/projects/${projectId}/dashboard`),
        apiFetch<ExecutionCycle[]>(`/api/v1/projects/${projectId}/execution-cycles`),
        apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`),
      ]);
      setProject(p);
      setName(p.name);
      setDescription(p.description ?? "");
      setClientCompany(p.client_company ?? "");
      setReleaseVersion(p.release_version ?? "");
      setDash(d);
      const sorted = [...c].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCycleTotal(sorted.length);
      setCycles(sorted.slice(0, 5));
      setModuleCount(mods.length);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setFormError(null);
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
      setFormError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  if (loading || !project || !dash) {
    return <p className="text-sm text-slate-500">Loading project…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const st = statusPresentation(project.status);
  const by = dash.executions_by_status;
  const execSegments = [
    { value: by.pass ?? 0, color: COL.pass },
    { value: by.fail ?? 0, color: COL.fail },
    { value: by.blocked ?? 0, color: COL.blocked },
    { value: by.not_run ?? 0, color: COL.not_run },
    { value: by.retest ?? 0, color: COL.retest },
  ];
  const execLegend = [
    { label: "Pass", value: by.pass ?? 0, color: COL.pass },
    { label: "Fail", value: by.fail ?? 0, color: COL.fail },
    { label: "Blocked", value: by.blocked ?? 0, color: COL.blocked },
    { label: "Not Run", value: by.not_run ?? 0, color: COL.not_run },
  ];
  const defectsTotal = dash.defects_open + dash.defects_closed;
  const ver = project.release_version?.trim() ? project.release_version : "—";

  const quick = [
    { href: `${base}/modules`, label: "Modules", count: moduleCount },
    { href: `${base}/requirements`, label: "Requirements", count: dash.requirements_total },
    { href: `${base}/test-cases`, label: "Test Cases", count: dash.test_cases_total },
    { href: `${base}/runs`, label: "Execution Cycles", count: cycleTotal },
    { href: `${base}/executions`, label: "Executions", count: dash.executions_total },
    { href: `${base}/defects`, label: "Defects", count: defectsTotal },
    { href: `${base}/rtm`, label: "RTM", count: null as number | null },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {project.code}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${st.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              <span className="font-medium text-slate-600">Version:</span> {ver}
            </p>
            <p className="mt-0.5">
              <span className="font-medium text-slate-600">Created</span> {formatDate(project.created_at)}
            </p>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
        {project.client_company && <p className="mt-1 text-lg text-slate-500">{project.client_company}</p>}
        {project.description ? (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">{project.description}</p>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No description yet.</p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Requirements</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{dash.requirements_total}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Test Cases</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{dash.test_cases_total}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pass Rate</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-600">{dash.execution_pass_pct}%</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Open Defects</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-red-600">{dash.defects_open}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Execution Status</h2>
          <ConicDonut segments={execSegments} centerTitle={`${dash.execution_pass_pct}%`} centerSubtitle="Pass" />
          <ul className="mt-4 space-y-2 text-sm">
            {execLegend.map((row) => (
              <li key={row.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="font-medium tabular-nums text-slate-900">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Recent Execution Cycles</h2>
          <ul className="mt-4 space-y-3">
            {cycles.map((c) => {
              const cs = cycleStatusPresentation(c.status);
              const sub = [c.build_version, c.name].filter(Boolean).join(" · ");
              return (
                <li key={c.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <Link href={`${base}/runs`} className="group block">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                      {c.code} — {c.name}
                    </p>
                    {sub && <p className="text-xs text-slate-500">{sub}</p>}
                    <span
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cs.pill}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cs.dot}`} />
                      {cs.label}
                    </span>
                  </Link>
                </li>
              );
            })}
            {cycles.length === 0 && <li className="text-sm text-slate-500">No run cycles yet.</li>}
          </ul>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Quick Navigation</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quick.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <div>
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  {item.count !== null && <p className="text-xs text-slate-500">{item.count} items</p>}
                  {item.count === null && <p className="text-xs text-slate-500">Coverage matrix</p>}
                </div>
                <span className="text-slate-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && !roleLoading && (
        <details className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Edit project details</summary>
          <form onSubmit={save} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Project name</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Description</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Client / company</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Release / version</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={releaseVersion}
                  onChange={(e) => setReleaseVersion(e.target.value)}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {saved && <p className="text-sm text-emerald-600">Saved.</p>}
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
