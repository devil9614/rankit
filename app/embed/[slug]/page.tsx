import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedListClient } from "@/components/embed-list-client";
import { getServerPublicList } from "@/lib/server-lists";

type EmbedPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { slug } = await params;
  const list = await getServerPublicList(slug);
  return {
    title: list ? `${list.title} — RankIt embed` : "RankIt embed",
    robots: { index: false, follow: false }
  };
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { slug } = await params;
  const list = await getServerPublicList(slug);
  if (!list) notFound();
  return <EmbedListClient initialList={list} />;
}
