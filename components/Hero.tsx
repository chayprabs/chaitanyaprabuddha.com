export default function Hero() {
  const sectionLinks = [
    { href: "#about", label: "About" },
    { href: "#blog", label: "Blog" },
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

        <div className="mb-0 mt-16 hidden w-full border-y border-[rgba(0,0,0,0.1)] bg-transparent py-3 md:block">
          <div className="w-full overflow-x-hidden">
            <div
              className="grid w-full min-w-0 items-center md:min-w-[640px]"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${sectionLinks.length}, minmax(0, 1fr))`
              }}
            >
              {sectionLinks.map((item, index) => (
                <div
                  key={item.href}
                  className="relative text-center"
                >
                  <a
                    href={item.href}
                    className="block px-[2px] text-[11px] font-normal tracking-[0.02em] text-[#9a9890] transition-colors duration-150 ease-in-out hover:text-[#1a1a18] md:px-0 md:text-[13px] md:tracking-[0.05em]"
                    style={{
                      fontFamily: "var(--font-inter)",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.label}
                  </a>

                  {index < sectionLinks.length - 1 ? (
                    <span
                      className="pointer-events-none absolute right-0 top-1/2 translate-x-[40%] -translate-y-1/2 text-[10px] leading-none text-[rgba(0,0,0,0.2)] md:translate-x-1/2 md:text-[12px]"
                    >
                      {"\u00B7"}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
