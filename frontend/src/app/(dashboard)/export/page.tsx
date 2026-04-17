"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDownloadBlob, ApiError, apiFetch } from "@/lib/api";
import type { Project } from "@/types/api";

type ExportKind =
  | "full-workbook"
  | "requirements"
  | "test-cases"
  | "executions"
  | "defects"
  | "rtm"
  | "dashboard-summary";

const REPORTS: {
  kind: ExportKind;
  title: string;
  description: string;
  tags: string[];
  accent: "blue" | "emerald" | "rose" | "amber" | "slate";
}[] = [
  {
    kind: "full-workbook",
    title: "Full Project Workbook",
    description:
      "Multi-sheet Excel workbook (or condensed PDF) with summary, requirements, test cases, modules, execution cycles, executions, defects, and RTM-style coverage.",
    tags: ["Summary", "Requirements", "Test Cases", "Modules", "Cycles", "Executions", "Defects", "RTM"],
    accent: "blue",
  },
  {
    kind: "requirements",
    title: "Requirements Export",
    description: "All requirements with codes, titles, priorities, statuses, linked test case counts, and source references.",
    tags: ["Requirements", "Linked test cases"],
    accent: "emerald",
  },
  {
    kind: "test-cases",
    title: "Test Cases Export",
    description: "Test cases with types, priority, severity, reusable flag, step counts, preconditions, and descriptions.",
    tags: ["Test cases", "Steps"],
    accent: "emerald",
  },
  {
    kind: "executions",
    title: "Execution History",
    description: "Executions with test case and cycle references, timestamps, status, retest flags, actual results, and comments.",
    tags: ["Execution cycles", "Executions"],
    accent: "emerald",
  },
  {
    kind: "defects",
    title: "Defects Report",
    description: "Defects with severity, priority, status, and descriptions for triage and release reporting.",
    tags: ["Defects", "Summary"],
    accent: "rose",
  },
  {
    kind: "rtm",
    title: "RTM Export",
    description: "Requirement traceability-style rows: coverage, pass/fail/blocked counts, defects, and latest status.",
    tags: ["RTM", "Coverage"],
    accent: "amber",
  },
  {
    kind: "dashboard-summary",
    title: "Dashboard Summary",
    description: "Per-project roll-up of requirements, test cases, executions, defects, and key execution percentages.",
    tags: ["Summary", "Metrics"],
    accent: "slate",
  },
];

const accentRing: Record<string, string> = {
  blue: "ring-blue-200 bg-blue-50 text-blue-700",
  emerald: "ring-emerald-200 bg-emerald-50 text-emerald-700",
  rose: "ring-rose-200 bg-rose-50 text-rose-700",
  amber: "ring-amber-200 bg-amber-50 text-amber-800",
  slate: "ring-slate-200 bg-slate-50 text-slate-700",
};

export default function ExportPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<Project[]>("/api/v1/projects")
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  const download = useCallback(
    async (kind: ExportKind, format: "xlsx" | "pdf") => {
      const key = `${kind}-${format}`;
      setBusy(key);
      try {
        const params = new URLSearchParams({ format });
        if (projectId) params.set("project_id", projectId);
        const path = `/api/v1/exports/${kind}?${params.toString()}`;
        const blob = await apiDownloadBlob(path);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const slug = projects.find((p) => String(p.id) === projectId)?.code ?? "all-projects";
        a.download = `${kind}_${slug}_${format === "xlsx" ? "xlsx" : "pdf"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        window.alert(e instanceof ApiError ? e.message : "Download failed");
      } finally {
        setBusy(null);
      }
    },
    [projectId, projects],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Export</h1>
      <p className="mt-1 text-sm text-slate-500">Download structured reports from your local database as Excel or PDF.</p>

      <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50/90 px-5 py-4">
        <h2 className="text-sm font-semibold text-sky-900">Professional Excel &amp; PDF export</h2>
        <p className="mt-2 text-sm leading-relaxed text-sky-900/90">
          Reports are generated from your workspace data (SQLite via the API). Choose a project to limit exports to one
          workspace, or leave <strong>All projects</strong> to include every project you belong to. Excel files use the
          <code className="mx-1 rounded bg-white/80 px-1">.xlsx</code> format; PDFs use compact tables (very large lists may be
          truncated per section).
        </p>
      </div>

      <div className="mt-6 max-w-md">
        <label htmlFor="export-project" className="text-sm font-medium text-slate-700">
          Filter by project
        </label>
        <select
          id="export-project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none ring-slate-200 focus:ring-2"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
      </div>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <li
            key={r.kind}
            className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${accentRing[r.accent]}`}
                aria-hidden
              >
                {r.kind === "full-workbook" && "📊"}
                {r.kind === "requirements" && "📋"}
                {r.kind === "test-cases" && "✓"}
                {r.kind === "executions" && "▶"}
                {r.kind === "defects" && "🐛"}
                {r.kind === "rtm" && "🔗"}
                {r.kind === "dashboard-summary" && "📈"}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900">{r.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.description}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void download(r.kind, "xlsx")}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === `${r.kind}-xlsx` ? "…" : "⬇"} Excel (.xlsx)
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void download(r.kind, "pdf")}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
              >
                {busy === `${r.kind}-pdf` ? "…" : "⬇"} PDF
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
