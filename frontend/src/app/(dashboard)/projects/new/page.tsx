"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewProjectRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/projects?new=1");
  }, [router]);
  return <p className="text-sm text-slate-500">Opening create project…</p>;
}
