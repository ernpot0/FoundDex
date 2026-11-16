import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ReportItemForm } from "@/components/ReportItemForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ReportPageProps {
  searchParams: Promise<{ type?: string }>;
}

async function ReportPageContent({ searchParams }: ReportPageProps) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const initialType = params.type === "found" ? "found" : "lost";

  return <ReportItemForm userId={user.id} initialType={initialType} />;
}

export default function ReportPage(props: ReportPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Report a Lost or Found Item
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Share clear details so the rightful owner or finder can recognize
            the item.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 h-96 animate-pulse" />
          }
        >
          <ReportPageContent searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

