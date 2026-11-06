"use client";

import { createContext, useContext } from "react";
import { emptySiteContent, type SiteContent } from "@/lib/site-content";

const SiteContext = createContext<SiteContent>(emptySiteContent());

export function SiteProvider({ value, children }: { value: SiteContent; children: React.ReactNode }) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);
