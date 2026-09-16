import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RankIt — settle the order",
  description: "Publish a ranking. Let everyone argue with it.",
  icons: { icon: "/favicon.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
