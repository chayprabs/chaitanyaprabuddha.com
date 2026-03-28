import type { Metadata } from "next";
import { Bebas_Neue, Caveat, Jost, Lato } from "next/font/google";

import "./globals.css";

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas"
});

const jost = Jost({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-jost"
});

const lato = Lato({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["100", "300", "400", "700", "900"],
  variable: "--font-lato"
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500"],
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
        className={`${bebas.variable} ${jost.variable} ${lato.variable} ${caveat.variable} min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
