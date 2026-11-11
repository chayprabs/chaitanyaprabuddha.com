import type { Metadata, Viewport } from "next";
import { Caveat, Inter } from "next/font/google";

import Reveal from "@/components/Reveal";

import "./globals.css";

const SITE_URL = "https://www.chaitanyaprabuddha.com";
const SITE_TITLE = "Chaitanya Prabuddha | AI/ML Researcher, Builder, Founder";
const SITE_DESCRIPTION =
  "Chaitanya Prabuddha is a CS student at BITS Pilani who builds products, researches AI/ML, and writes about both. Founder of Cruxo, LeetCode for the prompting era.";

const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Chaitanya Prabuddha: I build products, not just code."
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-caveat"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Chaitanya Prabuddha"
  },
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
    "coding agents",
    "technical writing",
    "Cruxo",
    "machine learning projects"
  ],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Chaitanya Prabuddha",
    locale: "en_US",
    type: "website",
    images: [OG_IMAGE]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    creator: "@chayprabs",
    images: [OG_IMAGE.url]
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#efece5"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Lets CSS hide scroll-reveal blocks only when scripts will run. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')"
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Reveal />
      </body>
    </html>
  );
}
