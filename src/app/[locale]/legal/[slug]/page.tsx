import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { loadPublishedSiteContent } from "@/lib/site-content-server";
import { LEGAL_SLUGS, type LegalSlug } from "@/lib/site-content";
import { LEGAL_TEMPLATES } from "@/lib/legal-templates";

export const revalidate = 300;

const TITLES: Record<LegalSlug, string> = {
  tokushoho: "特定商取引法に基づく表記",
  privacy: "プライバシーポリシー",
  terms: "利用規約",
};

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: TITLES[slug as LegalSlug] ?? "" };
}

/** Plain text → headings ("## "), table rows ("| a | b |") and paragraphs. No HTML is ever interpreted. */
function render(text: string) {
  const out: React.ReactNode[] = [];
  let rows: string[][] = [];
  let para: string[] = [];
  const flushRows = () => {
    if (!rows.length) return;
    out.push(
      <div key={`t${out.length}`} className="my-6 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-navy-900/10">
                <th scope="row" className="w-48 bg-sky-50 px-4 py-3 text-left align-top font-semibold">{r[0]}</th>
                <td className="px-4 py-3 align-top whitespace-pre-line">{r.slice(1).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    rows = [];
  };
  const flushPara = () => {
    if (!para.length) return;
    out.push(<p key={`p${out.length}`} className="my-4 leading-relaxed whitespace-pre-line">{para.join("\n")}</p>);
    para = [];
  };
  for (const line of text.split("\n")) {
    const l = line.trimEnd();
    if (l.startsWith("|")) {
      flushPara();
      rows.push(l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
    } else if (l.startsWith("## ")) {
      flushRows();
      flushPara();
      out.push(<h2 key={`h${out.length}`} className="mt-10 mb-3 font-serif text-xl font-bold first:mt-0">{l.slice(3)}</h2>);
    } else if (!l.trim()) {
      flushRows();
      flushPara();
    } else {
      flushRows();
      para.push(l);
    }
  }
  flushRows();
  flushPara();
  return out;
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!(LEGAL_SLUGS as readonly string[]).includes(slug)) notFound();
  const content = await loadPublishedSiteContent();
  const own = content.legal[slug as LegalSlug];
  const text = own.trim() ? own : LEGAL_TEMPLATES[slug as LegalSlug];
  const unfinished = !own.trim() || text.includes("【要入力】");
  return (
    <>
      <SiteHeader />
      <main id="main" lang="ja" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        {unfinished && (
          <p role="note" className="mb-8 flex gap-2 rounded-xl bg-sun-200/60 p-4 text-sm text-sun-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            この内容は作成中のひな形です。【要入力】の部分は正式な情報に差し替えてください。
          </p>
        )}
        <article className="text-navy-900">{render(text)}</article>
      </main>
      <SiteFooter />
    </>
  );
}
