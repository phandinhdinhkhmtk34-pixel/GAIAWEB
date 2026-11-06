import { setRequestLocale } from "next-intl/server";
import { HomeView } from "@/components/home-view";
import { loadHomeCatalog, loadPublishedSiteContent } from "@/lib/site-content-server";

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [content, catalog] = await Promise.all([loadPublishedSiteContent(), loadHomeCatalog(locale)]);
  return <HomeView content={content} catalog={catalog} />;
}
