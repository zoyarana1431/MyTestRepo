"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TagInput } from "@/components/requirements/tag-input";
import { apiFetch, ApiError } from "@/lib/api";
import { PRIORITY, REQUIREMENT_STATUS, REQUIREMENT_STATUS_LABEL } from "@/lib/qa-options";
import { useProjectRole } from "@/hooks/use-project-role";
import { ModuleSubmoduleSelect } from "@/components/modules/module-submodule-select";
import type { ModuleFlat, Requirement } from "@/types/api";

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function NewRequirementPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useProjectRole(projectId);
  const [modules, setModules] = useState<ModuleFlat[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [status, setStatus] = useState<string>("draft");
  const [sourceReference, setSourceReference] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiFetch<ModuleFlat[]>(`/api/v1/projects/${projectId}/modules`).then(setModules).catch(() => {});
  }, [projectId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError(null);
    setPending(true);
    try {
      const r = await apiFetch<Requirement>(`/api/v1/projects/${projectId}/requirements`, {
        method: "POST",
        json: {
          title: title.trim(),
          description: description.trim() || null,
          module_id: moduleId === "" ? null : Number(moduleId),
          priority,
          status,
          source_reference: sourceReference.trim() || null,
          tags: tags.length ? tags : null,
        },
      });
      router.replace(`/projects/${projectId}/requirements/${r.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create");
    } finally {
      setPending(false);
    }
  }

  if (!roleLoading && !isAdmin) {
    return (
      <p className="text-sm text-slate-600">
        <Link href={`/projects/${projectId}/requirements`} className="text-blue-600 hover:underline">
          Back
        </Link>{" "}
        — admin only.
      </p>
    );
  }

  const listHref = `/projects/${projectId}/requirements`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="flex gap-3 border-b border-slate-100 pb-6">
          <Link
            href={listHref}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Back to requirements"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">New Requirement</h1>
            <p className="mt-1 text-sm text-slate-500">Fill in the requirement details below.</p>
          </div>
        </header>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-800">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Requirement title..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Description</label>
            <textarea
              className="mt-1.5 min-h-[120px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the requirement..."
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <ModuleSubmoduleSelect
                modules={modules}
                value={moduleId === "" ? null : Number(moduleId)}
                onChange={(id) => setModuleId(id == null ? "" : String(id))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">Source / Reference</label>
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                placeholder="Product Spec v2.4"
              />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">Priority</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITY.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">Status</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {REQUIREMENT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {REQUIREMENT_STATUS_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Tags</label>
            <div className="mt-1.5">
              <TagInput tags={tags} onChange={setTags} placeholder="Add tag and press Enter" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
            <Link
              href={listHref}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending || !isAdmin}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
