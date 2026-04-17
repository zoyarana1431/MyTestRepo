"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Opens the create modal on the runs list (`?create=1`). */
export default function NewRunRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    router.replace(`/projects/${projectId}/runs?create=1`);
  }, [projectId, router]);

  return <p className="text-sm text-slate-500">Opening create cycle…</p>;
}
