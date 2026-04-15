"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import { apiFetch } from "@/lib/api";
import type { Project } from "@/types/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiFetch<Project[]>("/api/v1/projects");
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

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-muted">Each project has its own workspace, modules, and access rules.</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow hover:bg-accent-hover"
        >
          New project
        </Link>
      </div>

      {loading && <p className="mt-8 text-sm text-ink-muted">Loading…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDeleted={() => void load()} />
          ))}
        </ul>
      )}

      {!loading && !error && projects.length === 0 && (
        <p className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-ink-muted">
          No projects yet. Create one to open a workspace.
        </p>
      )}
    </div>
  );
}
