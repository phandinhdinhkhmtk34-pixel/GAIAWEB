"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-3d print:hidden">
      <Printer size={18} aria-hidden />
      {label}
    </button>
  );
}
