import { HomeClient } from "@/components/home-client";
import { demoLists } from "@/lib/demo-data";

export default function HomePage() {
  return <HomeClient initialLists={demoLists} />;
}
