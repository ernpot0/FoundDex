import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, Award, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { PrintCertificateButton } from "@/components/PrintCertificateButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      .select("full_name")
      .eq("id", cert.finder_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", cert.owner_id)
      .maybeSingle(),
    supabase
      .from("items")
      .select("title, location_name")
      .eq("id", cert.item_id)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/recovery"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Recovery Center
        </Link>
        <PrintCertificateButton />
      </div>

      <div className="rounded-3xl border-4 border-emerald-600/30 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-sm text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
          <Award className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            FoundDex Official Recognition
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Certificate of Verified Return
          </h1>
        </div>

        <p className="text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          This certifies that{" "}
          <strong className="text-slate-900 dark:text-white">
            {finder?.full_name || "FoundDex Member"}
          </strong>{" "}
          honestly found and safely returned{" "}
          <strong className="text-slate-900 dark:text-white">
            &ldquo;{item?.title || "Returned Item"}&rdquo;
          </strong>{" "}
          to{" "}
          <strong className="text-slate-900 dark:text-white">
            {owner?.full_name || "Rightful Owner"}
          </strong>
          .
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-4 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          Dual Confirmation Verified • +{cert.points_awarded} Trust Points
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid sm:grid-cols-3 gap-4 text-xs text-slate-500">
          <div>
            <span className="block uppercase tracking-wide">Certificate ID</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {cert.certificate_code}
            </span>
          </div>
          <div>
            <span className="block uppercase tracking-wide">Location</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {item?.location_name || "Verified"}
            </span>
          </div>
          <div>
            <span className="block uppercase tracking-wide">Issued Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(cert.issued_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CertificatePage(props: CertificatePageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-10">
        <Suspense
          fallback={
            <div className="rounded-3xl border border-slate-200 bg-white p-12 h-80 animate-pulse" />
          }
        >
          <CertificateContent params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}

