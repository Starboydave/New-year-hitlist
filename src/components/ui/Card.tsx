import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
  className = "",
  id,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section aria-labelledby={title ? `${id ?? title}-h` : undefined} className={`rounded-3xl border border-sage-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={`${id ?? title}-h`} className="text-base font-semibold text-slate-800">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Hydrating({ children, ready }: { children: ReactNode; ready: boolean }) {
  if (ready) return <>{children}</>;
  return (
    <div role="status" aria-busy="true" className="grid gap-4">
      <span className="sr-only">Loading your wellness data…</span>
      <div className="h-40 animate-pulse rounded-3xl bg-sage-100" />
      <div className="h-64 animate-pulse rounded-3xl bg-sage-100" />
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-sage-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sage-700 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-sage-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-sage-50 disabled:opacity-50";
