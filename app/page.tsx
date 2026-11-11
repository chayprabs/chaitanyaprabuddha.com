import type { Metadata } from "next";

import Achievements from "@/components/Achievements";
import About from "@/components/About";
import BuiltInSchool from "@/components/BuiltInSchool";
import Contact from "@/components/Contact";
import Colophon from "@/components/Colophon";
import LocalTime from "@/components/LocalTime";
import Masthead from "@/components/Masthead";
import Now from "@/components/Now";
import Projects from "@/components/Projects";
import Research from "@/components/Research";
import Ventures from "@/components/Ventures";
import PageTitle from "@/components/PageTitle";

const HOME_TITLE = "Chaitanya Prabuddha | AI/ML Researcher, Builder, Founder";
const HOME_DESCRIPTION =
  "Chaitanya Prabuddha is a CS student at BITS Pilani who builds products, researches AI/ML, and writes about both. Founder of Authos, remote tools for coding agents.";

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
    creator: "@chayprabs",
    images: ["/og.png"]
  }
};

export default function HomePage() {
  return (
    <div id="top">
      <Masthead current="home" />
      <main>
        <PageTitle
          kicker={
            <>
              Pilani, India
              <LocalTime />
            </>
          }
        >
          I build products, <em>not just code.</em>
        </PageTitle>
        <About />
        <Ventures />
        <Projects />
        <Research />
        <Achievements />
        <BuiltInSchool />
        <Now />
        <section className="signoff">
          <p>
            Cheers,
            <br />
            Chaitanya Prabuddha
          </p>
        </section>
      </main>
      <Colophon />
      <Contact />
    </div>
  );
}
