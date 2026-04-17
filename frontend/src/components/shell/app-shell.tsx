"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { Project } from "@/types/api";

function ShieldLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0 text-blue-500" aria-hidden>
      <path
        d="M12 2.5l7 3.2v5.1c0 4.5-2.8 8.7-7 10.2-4.2-1.5-7-5.7-7-10.2V5.7l7-3.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </svg>
  );
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 8.5V18a2 2 0 002 2h14a2 2 0 002-2V8.5" />
      <path d="M3 8.5V6a2 2 0 012-2h5l2 2h8a2 2 0 012 2v.5" />
    </svg>
  );
}

function IconLibrary({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M5 4h4v16H5V4zM11 8h4v12h-4V8zM17 12h3v8h-3v-8z" strokeLinejoin="round" />
    </svg>
  );
}

function IconExport({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3v12M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M10 17l-1 1H5V6h4l1 1M15 12H9M20 12l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function crumbLabel(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/") return "Dashboard";
  if (pathname === "/projects") return "Projects";
  if (pathname === "/library" || pathname.startsWith("/library/")) return "Reusable Library";
  if (pathname.startsWith("/export")) return "Export";
  if (pathname.startsWith("/projects/")) return "Projects";
  return "Workspace";
}

function projectAreaLabel(rest: string): string {
  const first = rest.split("/")[0] || "";
  const map: Record<string, string> = {
    "": "Project Overview",
    dashboard: "Dashboard",
    modules: "Modules & Sub-Modules",
    requirements: "Requirements",
    "test-cases": "Test Cases",
    runs: "Run Cycles",
    executions: "Executions",
    defects: "Defects",
    rtm: "RTM",
    settings: "Team & access",
    new: "New",
  };
  if (first === "test-cases" && rest.includes("/new")) return "New test case";
  if (first === "requirements" && rest.includes("/new")) return "New requirement";
  if (first === "defects" && rest.includes("/new")) return "New defect";
  if (first === "projects") return "Projects";
  return map[first] || "Workspace";
}

function headerTitle(pathname: string, projects: Project[]): string {
  const m = pathname.match(/^\/projects\/(\d+)(?:\/(.*))?$/);
  if (!m) return crumbLabel(pathname);
  const id = m[1];
  const rest = m[2] ?? "";
  const p = projects.find((x) => String(x.id) === id);
  if (!p) return "Projects";
  const area = projectAreaLabel(rest);
  return `${p.code} / ${p.name} — ${area}`;
}

function projectSubLinks(projectId: string, pathname: string) {
  const base = `/projects/${projectId}`;
  const links = [
    { href: base, label: "Overview", match: (path: string) => path === base },
    { href: `${base}/modules`, label: "Modules", match: (path: string) => path.startsWith(`${base}/modules`) },
    { href: `${base}/requirements`, label: "Requirements", match: (path: string) => path.startsWith(`${base}/requirements`) },
    { href: `${base}/test-cases`, label: "Test Cases", match: (path: string) => path.startsWith(`${base}/test-cases`) },
    { href: `${base}/runs`, label: "Execution Cycles", match: (path: string) => path.startsWith(`${base}/runs`) },
    { href: `${base}/executions`, label: "Executions", match: (path: string) => path.startsWith(`${base}/executions`) },
    { href: `${base}/defects`, label: "Defects", match: (path: string) => path.startsWith(`${base}/defects`) },
    { href: `${base}/rtm`, label: "RTM", match: (path: string) => path.startsWith(`${base}/rtm`) },
  ];
  return links.map((l) => {
    const active = l.match(pathname);
    return (
      <li key={l.href}>
        <Link
          href={l.href}
          className={`block rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
            active ? "bg-blue-600/90 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
          }`}
        >
          {l.label}
        </Link>
      </li>
    );
  });
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = useCallback(() => {
    void apiFetch<Project[]>("/api/v1/projects")
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects, pathname]);

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
      { href: "/projects", label: "Projects", Icon: IconFolder },
      { href: "/library", label: "Reusable Library", Icon: IconLibrary },
      { href: "/export", label: "Export", Icon: IconExport },
    ],
    [],
  );

  const initial = (user?.full_name || user?.email || "U").trim().charAt(0).toUpperCase();
  const projectMatch = pathname.match(/^\/projects\/(\d+)/);
  const activeProjectId = projectMatch?.[1] ?? null;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-[#141b2d] text-slate-300">
        <div className="border-b border-white/5 px-4 py-5">
          <Link href="/dashboard" className="flex items-start gap-3">
            <ShieldLogo />
            <div>
              <p className="text-sm font-bold tracking-tight text-white">QA Manager</p>
              <p className="text-xs text-slate-500">Test Management</p>
            </div>
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map(({ href, label, Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : href === "/projects"
                  ? pathname === "/projects" || pathname.startsWith("/projects/")
                  : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={active ? "text-white" : "text-slate-500"} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-4">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Projects</p>
          <ul className="mt-2 space-y-1">
            {projects.map((p) => {
              const open = activeProjectId === String(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className={`block truncate rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                      open ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {p.name}
                  </Link>
                  {open && (
                    <ul className="mt-1 space-y-0.5 border-l border-white/10 py-1 pl-2">{projectSubLinks(String(p.id), pathname)}</ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-auto border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.full_name || user?.email || "User"}</p>
              <p className="text-xs text-slate-500">Member</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="shrink-0 rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-slate-50">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-2">
          <span className="min-w-0 text-sm font-medium leading-snug text-slate-700">{headerTitle(pathname, projects)}</span>
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative hidden sm:block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Quick search…"
                className="h-9 w-56 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30"
                readOnly
                title="Search coming soon"
              />
            </div>
            <button
              type="button"
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
              title="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0h6z" strokeLinejoin="round" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initial}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
