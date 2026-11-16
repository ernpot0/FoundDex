import { CheckCircle2, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const PILLARS = [
  {
    title: "Find",
    description:
      "Report lost or found items with clear descriptions and privacy-friendly location details.",
    icon: Compass,
  },
  {
    title: "Verify",
    description:
      "Protect rightful owners with structured ownership verification before sharing personal contact details.",
    icon: ShieldCheck,
  },
  {
    title: "Return",
    description:
      "Coordinate safe returns and recognize helpful community members—never a marketplace, never for buying or selling.",
    icon: Sparkles,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-16 flex flex-col gap-14">
        <section className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Local application initialized and running
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            Find. Verify. Return.
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>FoundDex</strong> is a global lost-and-found platform built
            to help people report lost or found items, match them intelligently,
            verify rightful ownership, and coordinate safe returns.
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            FoundDex is strictly a community lost-and-found service—not an
            e-commerce marketplace. Users cannot buy or sell products here.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-lg">{pillar.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <h2 className="font-semibold text-base">
            Phase 1 Milestone Status
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The core Next.js, TypeScript, Tailwind CSS, Zod validation, and
            Supabase integration scaffolding are ready. Database, authentication,
            maps, and AI matching will be connected step-by-step in upcoming
            phases.
          </p>
          <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
            Health endpoint:{" "}
            <a
              href="/api/health"
              className="font-mono text-emerald-700 dark:text-emerald-400 underline underline-offset-2"
            >
              /api/health
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        FoundDex (founddex.com) — Fresh Foundation • Phase 1
      </footer>
    </div>
  );
}
