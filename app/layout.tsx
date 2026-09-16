import type { Metadata } from "next";
import "./globals.css";
import "./polish.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rankit.logidev.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "RankIt — settle the order",
  description: "Publish a ranking. Let everyone argue with it.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "RankIt",
    title: "RankIt — settle the order",
    description: "Publish a ranking. Let everyone argue with it."
  },
  twitter: {
    card: "summary_large_image",
    title: "RankIt — settle the order",
    description: "Publish a ranking. Let everyone argue with it."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
