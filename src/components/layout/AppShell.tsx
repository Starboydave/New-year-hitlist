"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Leaf, Wind, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useWellness } from "@/context/WellnessContext";
import { formatClock } from "@/lib/dates";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/breathe", label: "Breathe", icon: Wind },
  { href: "/analytics", label: "Analytics", icon: Activity },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { hydrated, remainingSec, paused } = useWellness();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden border-r border-sage-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:p-6">
        <Brand />
        <nav aria-label="Primary" className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} active={pathname === item.href} />
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-sage-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Next mobility break</p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-sage-700" aria-hidden={!hydrated}>
            {hydrated ? formatClock(remainingSec) : "--:--"}
          </p>
          <p className="mt-1 text-xs">{paused ? "Timer paused" : "Focus time is being tracked"}</p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sage-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <span className="rounded-full bg-sage-100 px-3 py-1 font-mono text-sm tabular-nums text-sage-800">
          {hydrated ? formatClock(remainingSec) : "--:--"}
        </span>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-sage-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                active ? "text-sage-700" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-sage-600 text-white">
        <Leaf className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-800">
        Ergo <span className="text-sage-600">TMS</span>
      </span>
    </Link>
  );
}

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-sage-100 text-sage-800" : "text-slate-600 hover:bg-sage-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      {label}
    </Link>
  );
}
