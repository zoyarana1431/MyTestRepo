"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

const nav = [
  { href: "/projects", label: "Projects" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-border bg-surface-muted/80">
        <div className="border-b border-border px-4 py-4">
          <Link href="/projects" className="text-sm font-semibold tracking-tight text-ink">
            QA Test Manager
          </Link>
          <p className="mt-1 text-xs text-ink-muted">Local workspace</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <p className="truncate text-xs text-ink-muted">{user?.email}</p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-2 text-xs font-medium text-ink-muted hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 bg-surface">{children}</main>
    </div>
  );
}
