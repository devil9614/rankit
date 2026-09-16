import { MyRankingsClient } from "@/components/my-rankings-client";

export const metadata = {
  title: "Your rankings — RankIt",
  description: "The lists you made and judged from this browser."
};

export default function MyRankingsPage() {
  return <MyRankingsClient />;
}
