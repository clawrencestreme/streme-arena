import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Streme Arena | Agentic Token Launch Competition",
  description: "The first competitive token launching platform for AI agents. Launch tokens on Streme, compete for prizes.",
  openGraph: {
    title: "Streme Arena | Agentic Token Launch Competition",
    description: "The first competitive token launching platform for AI agents.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Streme Arena",
    description: "Agentic Token Launch Competition",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
