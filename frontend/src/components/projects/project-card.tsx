"use client";

import Link from "next/link";
import { useProjectRole } from "@/hooks/use-project-role";
import { apiFetch, ApiError } from "@/lib/api";
import type { Project } from "@/types/api";

type Props = {
  project: Project;
  onDeleted: () => void;
};

export function ProjectCard({ project, onDeleted }: Props) {
  const { isAdmin, loading } = useProjectRole(String(project.id));

  async function remove() {
    if (!isAdmin) return;
    if (
      !window.confirm(
        "Delete this project permanently? All modules, requirements, test cases, and related data in this workspace will be removed.",
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
    <li className="rounded-xl border border-border bg-surface-muted/30 transition-shadow hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <Link href={`/projects/${project.id}`} className="block flex-1 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-ink-muted">{project.code}</p>
              <h2 className="mt-1 font-semibold text-ink">{project.name}</h2>
              {project.client_company && (
                <p className="mt-1 text-sm text-ink-muted">{project.client_company}</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                project.status === "archived"
                  ? "bg-surface-muted text-ink-muted"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {project.status}
            </span>
          </div>
        </Link>
        {!loading && isAdmin && (
          <div className="flex shrink-0 flex-row gap-1 border-t border-border p-2 sm:flex-col sm:border-l sm:border-t-0 sm:py-3">
            <Link
              href={`/projects/${project.id}`}
              className="rounded-md px-3 py-2 text-center text-sm font-medium text-accent hover:bg-surface"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => void remove()}
              className="rounded-md px-3 py-2 text-center text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
