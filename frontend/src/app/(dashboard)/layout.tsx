"use client";

import { AppShell } from "@/components/shell/app-shell";
import { Protected } from "@/components/protected";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <AppShell>{children}</AppShell>
    </Protected>
  );
}
