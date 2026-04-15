"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Project } from "@/types/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [releaseVersion, setReleaseVersion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const p = await apiFetch<Project>("/api/v1/projects", {
        method: "POST",
        json: {
          name,
          description: description || null,
          client_company: clientCompany || null,
          release_version: releaseVersion || null,
        },
      });
      router.replace(`/projects/${p.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <Link href="/projects" className="text-sm text-ink-muted hover:text-ink">
        ← Back to projects
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink">New project</h1>
      <p className="mt-1 text-sm text-ink-muted">You will be the project admin and can invite viewers.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">Project name *</label>
          <input
            required
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <label className="text-xs font-medium text-ink-muted">Client / company</label>
          <input
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={clientCompany}
            onChange={(e) => setClientCompany(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Release / version</label>
          <input
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={releaseVersion}
            onChange={(e) => setReleaseVersion(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create workspace"}
        </button>
      </form>
    </div>
  );
}
