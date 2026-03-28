import Achievements from "@/components/Achievements";
import About from "@/components/About";
import Authos from "@/components/Authos";
import BuiltInSchool from "@/components/BuiltInSchool";
import Contact from "@/components/Contact";
import Hero from "@/components/Hero";
import Now from "@/components/Now";
import Projects from "@/components/Projects";
import Research from "@/components/Research";

export default function HomePage() {
  return (
    <div id="top" className="min-h-screen overflow-x-hidden bg-[var(--background)]">
      <main className="overflow-x-hidden">
        <Hero />
        <About />
        <Authos />
        <Projects />
        <Research />
        <Achievements />
        <BuiltInSchool />
        <Now />
        <section
          style={{ padding: "48px 0 100px 0", marginTop: "-16px", textAlign: "center" }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
            <p
              style={{
                fontFamily: "var(--font-caveat)",
                fontSize: "32px",
                color: "#6b6860",
                lineHeight: "1.2",
                margin: "0"
                ,
                transform: "rotate(-3deg)"
              }}
            >
              Cheers,
              <br />
              Chaitanya Prabuddha
            </p>
          </div>
        </section>
      </main>
      <Contact />
    </div>
  );
}
