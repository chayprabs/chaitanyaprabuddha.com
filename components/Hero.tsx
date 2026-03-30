import SectionJumpBar from "@/components/SectionJumpBar";

export default function Hero() {
  const sectionLinks = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "#projects", label: "Projects" },
    { href: "#research", label: "Research" },
    { href: "#achievements", label: "Achievements" }
  ];

  return (
    <section className="pb-8 pt-[60px] md:pb-6 md:pt-20">
      <div className="mx-auto w-full max-w-[800px]">
        <h1
          className="max-w-[600px] break-words text-[36px] font-bold leading-[1.1] text-[#1a1a18] md:text-[72px]"
          style={{
            fontFamily: "var(--font-inter)",
            margin: "0"
          }}
        >
          I build products, not just code.
        </h1>

        <SectionJumpBar links={sectionLinks} />
      </div>
    </section>
  );
}
