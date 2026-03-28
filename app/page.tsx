import Achievements from "@/components/Achievements";
import About from "@/components/About";
import Authos from "@/components/Authos";
import BuiltInSchool from "@/components/BuiltInSchool";
import Contact from "@/components/Contact";
import Hero from "@/components/Hero";
import Nav from "@/components/Nav";
import Now from "@/components/Now";
import Projects from "@/components/Projects";
import Research from "@/components/Research";

export default function HomePage() {
  return (
    <div id="top" className="min-h-screen overflow-x-hidden bg-[var(--color-cream)]">
      <Nav />
      <main className="overflow-x-hidden pt-[60px]">
        <Hero />
        <About />
        <Authos />
        <Projects />
        <Research />
        <Achievements />
        <BuiltInSchool />
        <Now />
      </main>
      <Contact />
    </div>
  );
}
