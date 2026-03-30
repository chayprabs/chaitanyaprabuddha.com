import type { Metadata } from "next";
import { Caveat, Inter } from "next/font/google";

import "./globals.css";

const SITE_URL = "https://chaitanyaprabuddha.com";
const SITE_TITLE = "Chaitanya Prabuddha | AI/ML Researcher, Builder, Founder";
const SITE_DESCRIPTION =
  "Personal website of Chaitanya Prabuddha, CS student at BITS Pilani, AI/ML researcher, builder, and founder of Authos. Explore projects, research, writing, and achievements.";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter"
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-caveat"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Chaitanya Prabuddha",
  authors: [
    {
      name: "Chaitanya Prabuddha",
      url: SITE_URL
    }
  ],
  creator: "Chaitanya Prabuddha",
  publisher: "Chaitanya Prabuddha",
  category: "technology",
  keywords: [
    "Chaitanya Prabuddha",
    "AI/ML researcher",
    "BITS Pilani",
    "LLM engineering",
    "AI agents",
    "technical writing",
    "Authos",
    "machine learning projects"
  ],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Chaitanya Prabuddha",
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    creator: "@chayprabs"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${caveat.variable} min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
