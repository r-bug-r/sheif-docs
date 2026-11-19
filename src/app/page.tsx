import Link from "next/link";
import { ArrowRight, Bold, Heading1, Italic, List, Lock, Share2, Underline, Upload } from "lucide-react";

const COMPARISONS = [
  {
    label: "Interface",
    problem: "40-button ribbon and forced AI pop-ups",
    solution: "Transparent floating header and collapsible drawer",
  },
  {
    label: "Markdown & .docx",
    problem: "Broken formatting on import and export",
    solution: "Live #, **, - shortcuts plus .txt, .md, .docx preview import",
  },
  {
    label: "Shared with me",
    problem: "Unstructured list with unclear edit rights",
    solution: "Owned vs Shared sections with Can edit and View only pills",
  },
  {
    label: "Reading & Dark Mode",
    problem: "Bright white chrome and extension workarounds",
    solution: "Native Light and Dark paper in one click",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-desk)] text-[var(--text-ink)]">
      <header className="w-full px-5 sm:px-10 lg:px-14 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold tracking-tight text-[15px]">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] bg-[var(--accent)] text-white text-xs font-bold">
            A
          </span>
          <span>Ajaia Docs</span>
        </div>
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] active:scale-[0.97] transition"
        >
          <span>Open Workspace</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="flex-1 w-full px-5 sm:px-10 lg:px-14 pt-6 pb-16 space-y-12">
        <section className="max-w-2xl space-y-5">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.08] text-balance">
            Write without the Google Docs clutter.
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-muted)]">
            Open-canvas editing, instant .docx and Markdown import, and clear team sharing.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] active:scale-[0.97] transition"
            >
              <span>Start Writing</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs?demo=bob"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--bg-subtle)] active:scale-[0.97] transition"
            >
              <span>Preview Shared View</span>
            </Link>
          </div>
        </section>

        {/* Real Product Surface Preview */}
        <section
          aria-label="Workspace preview"
          className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-desk)] p-4 sm:p-6 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-1.5 text-xs font-medium">
              <span>Q4 Product Launch Brief</span>
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Saved
              </span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-1 text-[var(--text-ink)]">
              <span className="p-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Heading1 className="h-3.5 w-3.5" />
              </span>
              <span className="p-1"><Bold className="h-3.5 w-3.5" /></span>
              <span className="p-1"><Italic className="h-3.5 w-3.5" /></span>
              <span className="p-1"><Underline className="h-3.5 w-3.5" /></span>
              <span className="p-1"><List className="h-3.5 w-3.5" /></span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-1.5 text-xs font-medium">
              <Upload className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span>Alice Chen</span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2 py-0.5 text-[11px] text-white">
                <Share2 className="h-3 w-3" />
                Share
              </span>
            </div>
          </div>

          <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-6 sm:px-10 py-8 sm:py-10 space-y-2.5">
            <div className="text-xl font-bold tracking-tight">Q4 Product Launch Brief</div>
            <div className="text-sm text-[var(--text-muted)]">
              Type <code className="rounded bg-[var(--bg-subtle)] px-1 py-0.5 text-xs">#</code> for headings, drop any <code className="rounded bg-[var(--bg-subtle)] px-1 py-0.5 text-xs">.docx</code> or <code className="rounded bg-[var(--bg-subtle)] px-1 py-0.5 text-xs">.md</code>, or switch accounts to verify <span className="inline-flex items-center gap-1 text-amber-800 font-medium"><Lock className="h-3 w-3" />View only</span> vs Edit access.
            </div>
          </div>
        </section>

        {/* Bendy-style Hairline Spec Index */}
        <section aria-label="Comparison">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] pb-3 border-b border-[var(--border-hairline)]">
            Why switch from Google Docs
          </h2>
          <div className="divide-y divide-[var(--border-hairline)]">
            {COMPARISONS.map((row) => (
              <div
                key={row.label}
                className="py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 text-sm items-baseline"
              >
                <div className="sm:col-span-3 font-medium">{row.label}</div>
                <div className="sm:col-span-4 text-[var(--text-muted)] line-through decoration-[var(--border-hairline)]">
                  {row.problem}
                </div>
                <div className="sm:col-span-5 font-medium">{row.solution}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
