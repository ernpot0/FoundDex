import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Info,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { PrintCertificateButton } from "@/components/PrintCertificateButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecognitionTier } from "@/lib/recognition";

interface CertificatePageProps {
  params: Promise<{ id: string }>;
}

async function CertificateContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: cert, error } = await supabase
    .from("finder_certificates")
    .select(
      "id, recovery_case_id, finder_id, owner_id, item_id, certificate_code, points_awarded, issued_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !cert) notFound();

  const [{ data: finder }, { data: owner }, { data: item }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, trust_points")
      .eq("id", cert.finder_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", cert.owner_id)
      .maybeSingle(),
    cert.item_id
      ? supabase
          .from("items")
          .select("title, location_name")
          .eq("id", cert.item_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const finderName = finder?.full_name || "FoundDex Member";
  const ownerName = owner?.full_name || "Rightful Owner";
  const itemTitle = item?.title || "Verified Returned Item";
  const locationName = item?.location_name || "Verified Safe Handover";
  const finderTier = getRecognitionTier(finder?.trust_points ?? cert.points_awarded);
  const issuedDate = new Date(cert.issued_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-xs print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/recovery"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-emerald-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Recovery Center
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Official &amp; Dual-Return Verified
          </span>
        </div>

        <PrintCertificateButton />
      </div>

      {/* Ceremonial Certificate Canvas */}
      <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-5 print:shadow-none print:rounded-none print:p-0">
        <div className="certificate-guilloche certificate-inner-frame rounded-xl px-6 py-10 sm:px-12 sm:py-14 relative overflow-hidden flex flex-col items-center text-center text-slate-900">
          {/* Corner Filigree Ornaments */}
          <svg
            aria-hidden="true"
            className="absolute top-4 left-4 w-11 h-11 text-amber-700/75 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 48 48"
          >
            <path d="M4 20V4H20M4 4L16 16M8 4C8 12 12 16 16 16M4 8C12 8 16 12 16 16" />
            <circle cx="8" cy="8" fill="currentColor" r="2" />
          </svg>
          <svg
            aria-hidden="true"
            className="absolute top-4 right-4 w-11 h-11 text-amber-700/75 pointer-events-none rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 48 48"
          >
            <path d="M4 20V4H20M4 4L16 16M8 4C8 12 12 16 16 16M4 8C12 8 16 12 16 16" />
            <circle cx="8" cy="8" fill="currentColor" r="2" />
          </svg>
          <svg
            aria-hidden="true"
            className="absolute bottom-4 left-4 w-11 h-11 text-amber-700/75 pointer-events-none -rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 48 48"
          >
            <path d="M4 20V4H20M4 4L16 16M8 4C8 12 12 16 16 16M4 8C12 8 16 12 16 16" />
            <circle cx="8" cy="8" fill="currentColor" r="2" />
          </svg>
          <svg
            aria-hidden="true"
            className="absolute bottom-4 right-4 w-11 h-11 text-amber-700/75 pointer-events-none rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 48 48"
          >
            <path d="M4 20V4H20M4 4L16 16M8 4C8 12 12 16 16 16M4 8C12 8 16 12 16 16" />
            <circle cx="8" cy="8" fill="currentColor" r="2" />
          </svg>

          {/* Subtle Center Watermark Seal */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]"
          >
            <svg className="w-80 h-80 text-emerald-950" viewBox="0 0 400 400">
              <circle
                cx="200"
                cy="200"
                fill="none"
                r="180"
                stroke="currentColor"
                strokeDasharray="6,4"
                strokeWidth="2"
              />
              <circle
                cx="200"
                cy="200"
                fill="none"
                r="155"
                stroke="currentColor"
                strokeWidth="1"
              />
              <polygon
                fill="none"
                points="200,40 240,160 360,200 240,240 200,360 160,240 40,200 160,160"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Top Recognition Ribbon */}
          <div className="relative z-10 mb-5">
            <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-amber-300 shadow-md">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
                FoundDex Official Recognition
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
            </div>
          </div>

          {/* Ceremonial Gold & Emerald Emblem */}
          <div className="relative z-10 mb-5 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-emerald-950 flex items-center justify-center text-amber-300 relative">
                <div className="absolute inset-1 rounded-full border border-dashed border-amber-400/40" />
                <Award className="h-8 w-8 sm:h-9 sm:w-9 text-amber-300" />
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="relative z-10 max-w-3xl mb-7">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              Certificate of Verified Return
            </h1>
            <p className="font-serif italic text-sm sm:text-base text-emerald-900/90 font-medium mt-2">
              Conferred in Recognition of Honesty, Civic Responsibility &amp;
              Community Integrity
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-600" />
              <div className="w-2 h-2 rotate-45 bg-amber-600" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-600" />
            </div>
          </div>

          {/* Citation */}
          <div className="relative z-10 max-w-2xl flex flex-col items-center mb-8">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">
              This certificate is formally conferred upon
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-950">
              {finderName}
            </h2>

            <span className="inline-flex items-center gap-1.5 mt-2 text-emerald-800 text-xs font-semibold uppercase tracking-wider bg-emerald-100/80 px-3 py-0.5 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              {finderTier.name}
            </span>

            <p className="font-serif text-slate-700 text-sm sm:text-base md:text-lg leading-relaxed mt-5 px-2">
              In grateful acknowledgment of the safe, unprompted discovery and
              verified return of{" "}
              <strong className="text-slate-950 font-semibold underline decoration-amber-600/50 underline-offset-4">
                &ldquo;{itemTitle}&rdquo;
              </strong>{" "}
              to its rightful owner,{" "}
              <strong className="text-slate-950 font-semibold">
                {ownerName}
              </strong>
              .
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white shadow-xs ring-1 ring-slate-200 text-xs font-semibold text-slate-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Dual Confirmation Verified
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white shadow-xs ring-1 ring-slate-200 text-xs font-semibold text-slate-800">
                <Award className="h-3.5 w-3.5 text-amber-600" />+
                {cert.points_awarded} Community Trust Points
              </span>
            </div>
          </div>

          <div className="w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent my-4" />

          {/* Metadata Strip */}
          <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-left p-4 rounded-xl bg-slate-50/90 ring-1 ring-slate-200/70 mb-7">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Certificate ID
              </span>
              <p className="font-mono text-xs font-bold text-slate-900 mt-1">
                {cert.certificate_code}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Discovery / Return Area
              </span>
              <p className="text-xs font-semibold text-slate-900 mt-1 inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                {locationName}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Issued Date
              </span>
              <p className="text-xs font-semibold text-slate-900 mt-1">
                {issuedDate}
              </p>
            </div>
          </div>

          {/* Dual Verification & Seal Strip */}
          <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 items-end gap-6 mb-4">
            <div className="flex flex-col items-center">
              <svg
                aria-hidden="true"
                className="h-10 text-emerald-950 opacity-80"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                viewBox="0 0 240 60"
              >
                <path d="M15 35 C 30 10, 50 15, 60 38 C 70 55, 90 20, 110 32 C 130 45, 140 25, 160 36 C 180 45, 200 20, 225 30" />
                <path d="M45 42 Q 95 18 175 40" strokeWidth="1.4" />
              </svg>
              <div className="w-44 h-px bg-slate-300" />
              <span className="font-serif text-xs font-bold text-slate-900 mt-1.5">
                FoundDex Protocol
              </span>
              <span className="text-[10px] text-slate-500">
                Find. Verify. Return.
              </span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 p-1 shadow-lg flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-emerald-900 text-amber-300 flex flex-col items-center justify-center p-1.5 text-center relative border border-amber-300/30">
                  <div className="absolute inset-1 rounded-full border border-dashed border-amber-300/50" />
                  <ShieldCheck className="h-5 w-5 text-amber-300" />
                  <span className="text-[7px] font-bold tracking-wider uppercase leading-tight mt-0.5">
                    Verified Return
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="h-10 flex items-center justify-center font-serif italic text-base text-emerald-950">
                {ownerName}
              </div>
              <div className="w-44 h-px bg-slate-300" />
              <span className="font-serif text-xs font-bold text-slate-900 mt-1.5">
                {ownerName}
              </span>
              <span className="text-[10px] text-slate-500">
                Rightful Owner Confirmation
              </span>
            </div>
          </div>

          <p className="relative z-10 mt-3 text-[10px] text-slate-500 max-w-xl">
            Verified by FoundDex Dual-Return Protocol • Issued only after both
            finder handover and owner receipt confirmations.
          </p>
        </div>
      </div>

      {/* Print tip (hidden in print) */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 print:hidden">
        <Info className="h-3.5 w-3.5 text-emerald-600" />
        <span>
          Tip: Select <strong>Landscape</strong> in your browser print dialog
          for optimal certificate framing.
        </span>
      </div>
    </div>
  );
}

export default function CertificatePage(props: CertificatePageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 py-8 print:p-0 print:max-w-none">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white p-12 h-96 animate-pulse" />
          }
        >
          <CertificateContent params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}
