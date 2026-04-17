"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiDownloadBlob, apiFetch, apiUploadFile } from "@/lib/api";
import {
  lastRunDotClass,
  lastRunLabel,
  lastRunPillClass,
} from "@/lib/test-case-presentation";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Attachment, Execution, ExecutionCycle } from "@/types/api";

function formatDetailDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function AttachmentPreview({
  projectId,
  att,
  onDownload,
}: {
  projectId: string;
  att: Attachment;
  onDownload: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = att.content_type?.startsWith("image/") ?? false;

  useEffect(() => {
    if (!isImage) return;
    let objectUrl: string | undefined;
    let cancelled = false;
    void apiDownloadBlob(`/api/v1/projects/${projectId}/attachments/${att.id}/download`).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, att.id, isImage]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      {isImage && previewUrl ? (
        <button type="button" onClick={onDownload} className="block w-full text-left">
          {/* Blob URLs: native img */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="max-h-40 w-full rounded-md object-cover"
          />
        </button>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
          File
        </div>
      )}
      <button
        type="button"
        onClick={onDownload}
        className="mt-2 w-full truncate text-center text-xs font-medium text-blue-600 hover:underline"
      >
        {att.original_filename}
      </button>
    </div>
  );
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const executionId = params.executionId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [ex, setEx] = useState<Execution | null>(null);
  const [cycle, setCycle] = useState<ExecutionCycle | null>(null);
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const e = await apiFetch<Execution>(`/api/v1/projects/${projectId}/executions/${executionId}`);
    setEx(e);
    if (e.execution_cycle_id) {
      const c = await apiFetch<ExecutionCycle>(
        `/api/v1/projects/${projectId}/execution-cycles/${e.execution_cycle_id}`,
      ).catch(() => null);
      setCycle(c);
    } else {
      setCycle(null);
    }
    const a = await apiFetch<Attachment[]>(`/api/v1/projects/${projectId}/executions/${executionId}/attachments`);
    setAtts(a);
  }, [projectId, executionId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiUploadFile<Attachment>(`/api/v1/projects/${projectId}/executions/${executionId}/attachments`, fd);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeExecution() {
    if (!ex || !isAdmin) return;
    if (
      !window.confirm(
        `Delete ${ex.code}? This removes the execution and any attached evidence files. Defects linked to it will have the execution reference cleared.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/executions/${executionId}`, { method: "DELETE" });
      router.push(`/projects/${projectId}/executions`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function download(att: Attachment) {
    const blob = await apiDownloadBlob(`/api/v1/projects/${projectId}/attachments/${att.id}/download`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.original_filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ex) {
    return <p className="text-sm text-slate-500">{error ?? "Loading…"}</p>;
  }

  const cycleLabel = cycle != null ? `${cycle.code} — ${cycle.name}` : "—";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/projects/${projectId}/executions`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Test Executions
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Execution Detail</h1>
          <p className="mt-1 font-mono text-lg font-semibold text-emerald-700">{ex.code}</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => void removeExecution()}
            disabled={deleting}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete execution"}
          </button>
        )}
      </header>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <dl className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Execution ID</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-slate-900">{ex.code}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</dt>
          <dd className="mt-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${lastRunPillClass(ex.status)}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${lastRunDotClass(ex.status)}`} />
              {lastRunLabel(ex.status)}
            </span>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Test Case</dt>
          <dd className="mt-1">
            <Link
              href={`/projects/${projectId}/test-cases/${ex.test_case_id}`}
              className="font-medium text-blue-600 hover:underline"
            >
              Open test case #{ex.test_case_id}
            </Link>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cycle</dt>
          <dd className="mt-1 text-slate-900">{cycleLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Build</dt>
          <dd className="mt-1 text-slate-900">{ex.build_version ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Platform</dt>
          <dd className="mt-1 text-slate-900">{ex.platform ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Environment</dt>
          <dd className="mt-1 text-slate-900">{ex.environment ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Executed On</dt>
          <dd className="mt-1 text-slate-900">{formatDetailDate(ex.executed_at)}</dd>
        </div>
        {ex.retest_required && (
          <div className="sm:col-span-2">
            <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
              Retest required
            </span>
          </div>
        )}
      </dl>

      {ex.actual_result?.trim() && (
        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5">
          <h2 className="text-sm font-semibold text-emerald-900">Actual Result</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-950/90">{ex.actual_result}</p>
        </section>
      )}

      {ex.comments?.trim() && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-800">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{ex.comments}</p>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Evidence ({atts.length})</h2>
        {isAdmin && (
          <div className="mt-3">
            <input
              type="file"
              disabled={uploading}
              onChange={(e) => void onFile(e)}
              className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700"
            />
          </div>
        )}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {atts.map((a) => (
            <li key={a.id}>
              <AttachmentPreview projectId={projectId} att={a} onDownload={() => void download(a)} />
            </li>
          ))}
        </ul>
        {atts.length === 0 && <p className="mt-2 text-sm text-slate-500">No attachments.</p>}
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Comments</h2>
        <p className="mt-2 text-sm text-slate-500">No comments</p>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            disabled
            placeholder="Comment…"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400"
          />
          <button
            type="button"
            disabled
            className="rounded-full bg-blue-600 p-2 text-white opacity-40"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M2 21l21-9L2 3v7l15 2-15 2v9z" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Thread comments are not enabled yet.</p>
      </section>

      <div className="mt-8 flex justify-end">
        <Link
          href={`/projects/${projectId}/executions`}
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
        >
          Close
        </Link>
      </div>
    </div>
  );
}
