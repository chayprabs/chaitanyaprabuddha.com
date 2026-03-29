const schoolProjects = [
  {
    name: "Developernoon",
    date: "",
    displayUrl: "developernoon.com",
    description:
      "A technical publishing platform I built and ran - writing and publishing 100+ developer articles across web development, Python, and open source. Reached a domain authority of 42 and 15,000 monthly visitors within 4 months, entirely through content.",
    stats: [
      { value: "42", label: "Domain authority" },
      { value: "15k", label: "Monthly visitors" }
    ]
  },
  {
    name: "Monial",
    date: "Mar 2022 \u2013 Jun 2022",
    displayUrl: "trymonial.app",
    description:
      "An embeddable testimonial SaaS for founders - one script tag, instant social proof on any website. Grew to 18 paying customers and $450+ MRR before JEE prep forced a shutdown.",
    stats: [
      { value: "18", label: "Customers" },
      { value: "$450+", label: "MRR" }
    ]
  }
];

export default function BuiltInSchool() {
  return (
    <section
      id="beforebits"
      className="w-full py-[48px]"
    >
      <div className="container">
        <p className="section-label mb-4">
          BEFORE BITS
        </p>

        <div>
          {schoolProjects.map((project, index) => (
            <article
              key={project.name}
              className={`${
                index > 0 ? "border-t-[0.5px] border-t-[var(--color-border)]" : ""
              }`}
            >
              <div className="rounded-[8px] border-[0.5px] border-transparent bg-transparent p-4 transition-all duration-200 ease-in-out hover:border-[rgba(0,0,0,0.1)] hover:bg-[#EDEAE5]">
                <div className="flex flex-col gap-[2px] md:flex-row md:items-start md:justify-between md:gap-2">
                  <h3 className="font-jost text-[16px] font-semibold leading-[1.8] text-[#1a1a18]">
                    {project.name}
                  </h3>
                  <div className="self-start md:self-auto">
                    {project.date ? (
                      <span className="cursor-default text-[12px] font-light leading-[1.85] text-[#b0ada8]">
                        {project.date}
                        {"  \u00b7  "}
                      </span>
                    ) : null}
                    <div className="group relative inline-block">
                      <span className="cursor-default text-[12px] font-light leading-[1.85] text-[#b0ada8]">
                        {project.displayUrl}
                      </span>
                      <div className="pointer-events-none absolute bottom-full left-1/2 mb-[6px] -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-[#1a1a18] px-[10px] py-1 text-[11px] font-light text-[#FAFAF8] opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100">
                        No longer active
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mb-[18px] mt-3 max-w-[840px] text-[15px] font-light leading-[1.85] text-[#3a3a38]">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-6 md:gap-10">
                  {project.stats.map((stat) => (
                    <div key={stat.label}>
                      <p className="font-bebas text-[22px] font-bold leading-[1.4] text-[#1a1a18] md:text-[26px]">
                        {stat.value}
                      </p>
                      <p className="font-jost mt-[3px] text-[11px] font-normal uppercase tracking-[0.1em] text-[#9a9890]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}

          <div className="border-t-[0.5px] border-t-[var(--color-border)]">
            <div className="rounded-[8px] border-[0.5px] border-transparent bg-transparent p-4 transition-all duration-200 ease-in-out hover:border-[rgba(0,0,0,0.1)] hover:bg-[#EDEAE5]">
              <h3 className="mb-2 text-[15px] font-semibold text-[#1a1a18]">
                Writing
              </h3>
              <p className="max-w-[860px] text-[15px] font-light leading-[1.85] text-[#3a3a38]">
                Technical writing that front-paged{" "}
                <span style={{ color: "#FF6600", fontWeight: 500 }}>
                  Hacker News
                </span>
                , hit 80k+ readers on{" "}
                <span style={{ color: "#006400", fontWeight: 500 }}>
                  freeCodeCamp
                </span>
                , and earned Author of the Week on both{" "}
                <span style={{ color: "#2563EB", fontWeight: 500 }}>
                  Hashnode
                </span>{" "}
                and{" "}
                <span style={{ color: "#cc0000", fontWeight: 500 }}>
                  daily.dev
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
