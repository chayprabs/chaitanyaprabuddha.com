import type { Metadata } from "next";

import Achievements from "@/components/Achievements";
import About from "@/components/About";
import BuiltInSchool from "@/components/BuiltInSchool";
import Contact from "@/components/Contact";
import Colophon from "@/components/Colophon";
import Masthead from "@/components/Masthead";
import Now from "@/components/Now";
import Projects from "@/components/Projects";
import Research from "@/components/Research";
import Ventures from "@/components/Ventures";
import PageTitle from "@/components/PageTitle";

const HOME_TITLE = "Chaitanya Prabuddha | AI/ML Researcher, Builder, Founder";
const HOME_DESCRIPTION =
  "Personal website of Chaitanya Prabuddha, CS student at BITS Pilani, AI/ML researcher, builder, and founder of Authos, a remote tool platform for coding agents.";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    siteName: "Chaitanya Prabuddha",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    creator: "@chayprabs"
  }
};

export default function HomePage() {
  return (
    <div id="top">
      <Masthead current="home" />
      <main>
        <PageTitle kicker={"Founder \u00b7 Researcher \u00b7 Writer"}>
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
