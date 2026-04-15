"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Project } from "@/types/api";

export function ProjectShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.projectId as string;
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await apiFetch<Project>(`/api/v1/projects/${projectId}`);
        if (!cancelled) setProject(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load project");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const base = `/projects/${projectId}`;
  const links = [
    { href: base, label: "Overview", match: (p: string) => p === base },
    { href: `${base}/dashboard`, label: "Dashboard", match: (p: string) => p.startsWith(`${base}/dashboard`) },
    { href: `${base}/modules`, label: "Modules", match: (p: string) => p.startsWith(`${base}/modules`) },
    {
      href: `${base}/requirements`,
      label: "Requirements",
      match: (p: string) => p.startsWith(`${base}/requirements`),
    },
    {
      href: `${base}/test-cases`,
      label: "Test cases",
      match: (p: string) => p.startsWith(`${base}/test-cases`),
    },
    { href: `${base}/runs`, label: "Runs", match: (p: string) => p.startsWith(`${base}/runs`) },
    {
      href: `${base}/executions`,
      label: "Executions",
      match: (p: string) => p.startsWith(`${base}/executions`),
    },
    { href: `${base}/defects`, label: "Defects", match: (p: string) => p.startsWith(`${base}/defects`) },
    { href: `${base}/rtm`, label: "RTM", match: (p: string) => p.startsWith(`${base}/rtm`) },
    { href: `${base}/settings`, label: "Team & access", match: (p: string) => p.startsWith(`${base}/settings`) },
  ];

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link href="/projects" className="mt-4 inline-block text-sm text-accent">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface-muted/50 px-8 py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <Link href="/projects" className="text-xs font-medium text-ink-muted hover:text-ink">
              ← All projects
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              {project?.name ?? "…"}
            </h1>
            <p className="mt-1 font-mono text-sm text-ink-muted">{project?.code}</p>
          </div>
        </div>
        <nav className="mt-6 flex flex-wrap gap-1">
          {links.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="flex-1 px-8 py-8">{children}</div>
    </div>
  );
}
