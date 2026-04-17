"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ReusableLibraryItem } from "@/types/api";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "functional", label: "Functional" },
  { value: "regression", label: "Regression" },
  { value: "smoke", label: "Smoke" },
  { value: "security", label: "Security" },
  { value: "api", label: "Api" },
  { value: "usability", label: "Usability" },
  { value: "integration", label: "Integration" },
  { value: "other", label: "Other" },
];

function formatTypeLabel(raw: string) {
  if (raw === "api") return "API";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function typePillClass(t: string) {
  const s = t.toLowerCase();
  if (s === "functional") return "bg-blue-600 text-white";
  if (s === "regression") return "bg-violet-600 text-white";
  if (s === "smoke") return "bg-slate-600 text-white";
  if (s === "security") return "bg-rose-700 text-white";
  if (s === "api") return "bg-cyan-600 text-white";
  return "bg-teal-600 text-white";
}

function priorityPillClass(p: string) {
  const s = p.toLowerCase();
  if (s === "critical") return "bg-red-600 text-white";
  if (s === "high") return "bg-orange-500 text-white";
  if (s === "medium") return "bg-amber-500 text-white";
  return "bg-slate-500 text-white";
}

export default function ReusableLibraryPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [items, setItems] = useState<ReusableLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 320);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (typeFilter && typeFilter !== "all") params.set("test_type", typeFilter);
      const qs = params.toString();
      const list = await apiFetch<ReusableLibraryItem[]>(`/api/v1/library/reusable-test-cases${qs ? `?${qs}` : ""}`);
      setItems(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const subtitle = useMemo(() => {
    const n = items.length;
    return `${n} reusable test case${n === 1 ? "" : "s"} across your projects`;
  }, [items.length]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reusable Test Case Library</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div
        className="mt-6 rounded-xl border border-teal-200 bg-teal-50/80 px-5 py-4"
        role="note"
      >
        <h2 className="text-sm font-semibold text-teal-800">About the Reusable Library</h2>
        <p className="mt-2 text-sm leading-relaxed text-teal-900/90">
          These are test cases you have marked <strong>reusable</strong> inside a project. They are ideal for common flows
          (login, logout, CRUD). Copy or adapt them into a project workspace; each item stays tied to its source project until
          you duplicate steps elsewhere.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search library…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-teal-500/20 focus:ring-2"
          />
        </div>
        <div className="sm:w-52">
          <label htmlFor="lib-type" className="sr-only">
            Filter by type
          </label>
          <select
            id="lib-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none ring-teal-500/20 focus:ring-2"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="mt-10 text-sm text-slate-500">Loading library…</p>}
      {error && <p className="mt-10 text-sm text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">No reusable test cases yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Open a project → <strong>Test cases</strong>, edit a case, and enable <strong>reusable</strong>. It will appear
            here automatically.
          </p>
          <Link href="/projects" className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
            Go to projects →
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={`${item.project_id}-${item.id}`}
              className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-xs font-semibold text-teal-800 ring-1 ring-teal-100">
                  {item.library_code}
                </span>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
                  Reusable
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{item.category_line}</p>
              {item.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{item.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${typePillClass(item.test_type)}`}>
                  {formatTypeLabel(item.test_type)}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${priorityPillClass(item.priority)}`}>
                  {item.priority}
                </span>
                {(item.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {item.preconditions && (
                <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950">
                  <span className="font-semibold text-amber-900">Preconditions:</span>{" "}
                  <span className="text-amber-950/90">{item.preconditions}</span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>
                  {item.project_code} · {item.project_name}
                </span>
                <Link
                  href={`/projects/${item.project_id}/test-cases/${item.id}`}
                  className="font-semibold text-teal-700 hover:text-teal-900"
                >
                  Open in project →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
