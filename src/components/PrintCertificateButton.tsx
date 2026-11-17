"use client";

import { Printer } from "lucide-react";

export function PrintCertificateButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print / Save as PDF
    </button>
  );
}

