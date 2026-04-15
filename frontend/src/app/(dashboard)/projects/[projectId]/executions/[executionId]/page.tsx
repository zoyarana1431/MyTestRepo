"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiDownloadBlob, apiFetch, apiUploadFile } from "@/lib/api";
import { useProjectRole } from "@/hooks/use-project-role";
import type { Attachment, Execution } from "@/types/api";

export default function ExecutionDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const executionId = params.executionId as string;
  const { isAdmin } = useProjectRole(projectId);
  const [ex, setEx] = useState<Execution | null>(null);
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const [e, a] = await Promise.all([
      apiFetch<Execution>(`/api/v1/projects/${projectId}/executions/${executionId}`),
      apiFetch<Attachment[]>(`/api/v1/projects/${projectId}/executions/${executionId}/attachments`),
    ]);
    setEx(e);
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
    return <p className="text-sm text-ink-muted">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href={`/projects/${projectId}/executions`} className="text-sm text-ink-muted hover:text-ink">
        ← Executions
      </Link>
      <div>
        <h2 className="text-xl font-semibold text-ink">{ex.code}</h2>
        <p className="mt-1 font-mono text-sm text-ink-muted">Test case #{ex.test_case_id}</p>
      </div>

      <dl className="grid gap-3 rounded-xl border border-border bg-surface-muted/20 p-6 text-sm">
        <div>
          <dt className="text-xs text-ink-muted">Status</dt>
          <dd className="capitalize">{ex.status.replace("_", " ")}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Executed at</dt>
          <dd>{new Date(ex.executed_at).toLocaleString()}</dd>
        </div>
        {ex.actual_result && (
          <div>
            <dt className="text-xs text-ink-muted">Actual result</dt>
            <dd className="whitespace-pre-wrap">{ex.actual_result}</dd>
          </div>
        )}
        {ex.comments && (
          <div>
            <dt className="text-xs text-ink-muted">Comments</dt>
            <dd className="whitespace-pre-wrap">{ex.comments}</dd>
          </div>
        )}
      </dl>

      <div className="rounded-xl border border-border bg-surface-muted/20 p-6">
        <h3 className="text-sm font-semibold text-ink">Evidence</h3>
        {isAdmin && (
          <div className="mt-3">
            <input type="file" disabled={uploading} onChange={(e) => void onFile(e)} className="text-sm" />
          </div>
        )}
        <ul className="mt-4 space-y-2">
          {atts.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm">
              <span>{a.original_filename}</span>
              <button type="button" className="text-accent hover:underline" onClick={() => void download(a)}>
                Download
              </button>
            </li>
          ))}
          {atts.length === 0 && <li className="text-ink-muted">No attachments.</li>}
        </ul>
      </div>
    </div>
  );
}
