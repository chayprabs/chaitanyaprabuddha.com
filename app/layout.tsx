import type { Metadata } from "next";
import { Caveat, Playfair_Display } from "next/font/google";

import "./globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-playfair-display"
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-caveat"
});

export const metadata: Metadata = {
  title: "Chaitanya Prabuddha",
  description: "Personal portfolio website for Chaitanya Prabuddha."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfairDisplay.variable} ${caveat.variable} min-h-screen overflow-x-hidden bg-[var(--color-cream)] text-[#4a4842] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
