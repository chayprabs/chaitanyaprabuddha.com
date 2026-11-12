import type { Metadata } from "next";

import Achievements from "@/components/Achievements";
import About from "@/components/About";
import BuiltInSchool from "@/components/BuiltInSchool";
import Now from "@/components/Now";
import Projects from "@/components/Projects";
import Research from "@/components/Research";
import Signoff from "@/components/Signoff";
import Ventures from "@/components/Ventures";
import PageTitle from "@/components/PageTitle";

const HOME_TITLE = "Chaitanya Prabuddha | AI/ML Researcher, Builder, Founder";
const HOME_DESCRIPTION =
  "Chaitanya Prabuddha is a CS student at BITS Pilani who builds products, researches AI/ML, and writes about both. Founder of Cruxo, LeetCode for the prompting era.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    siteName: "Chaitanya Prabuddha",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    creator: "@chayp05",
    images: ["/og.png"]
  }
};

export default function HomePage() {
  return (
    <main>
      <PageTitle>
        I build products, <em>not just code.</em>
      </PageTitle>
      <About />
      <Ventures />
      <Projects />
      <Research />
      <Achievements />
      <BuiltInSchool />
      <Now />
      <Signoff />
    </main>
  );
}
