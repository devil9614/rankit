import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListDetailClient } from "@/components/list-detail-client";
import { getServerPublicList } from "@/lib/server-lists";

type ListPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ListPageProps): Promise<Metadata> {
  const { slug } = await params;
  const list = await getServerPublicList(slug);
  if (!list) return { title: "Ranking not found — RankIt" };
  return {
    title: `${list.title} — RankIt`,
    description: `The creator's order is in. Add your take in five quick choices.`
  };
}

export default async function ListPage({ params }: ListPageProps) {
  const { slug } = await params;
  const list = await getServerPublicList(slug);
  if (!list) notFound();
  return <ListDetailClient initialList={list} />;
}
