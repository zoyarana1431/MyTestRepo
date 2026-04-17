"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function NewExecutionRedirectInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const testCaseId = searchParams.get("test_case_id");

  useEffect(() => {
    const q =
      testCaseId && /^\d+$/.test(testCaseId)
        ? `?record=1&test_case_id=${encodeURIComponent(testCaseId)}`
        : "?record=1";
    router.replace(`/projects/${projectId}/executions${q}`);
  }, [projectId, router, testCaseId]);

  return <p className="text-sm text-slate-500">Opening record execution…</p>;
}

export default function NewExecutionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <NewExecutionRedirectInner />
    </Suspense>
  );
}
