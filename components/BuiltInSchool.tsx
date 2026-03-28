const schoolProjects = [
  {
    name: "Developernoon",
    url: "https://developernoon.com",
    displayUrl: "developernoon.com",
    description:
      "A technical publishing platform for developers. Reached a domain authority of 42 and 15,000 monthly visitors within 4 months of launch.",
    stats: [
      { value: "42", label: "Domain authority" },
      { value: "15k", label: "Monthly visitors" },
      { value: "4mo", label: "To get there" }
    ]
  },
  {
    name: "Monial",
    url: "https://trymonial.app",
    displayUrl: "trymonial.app",
    description:
      "A testimonial SaaS for founders with a one-line integration. Grew to 10+ paying customers and $300+ MRR. Built and shut down during JEE prep.",
    stats: [
      { value: "10+", label: "Paying customers" },
      { value: "$300+", label: "MRR" },
      { value: "11th", label: "Grade" }
    ]
  }
];

const writingBadges = [
  "Hacker News",
  "freeCodeCamp",
  "Hashnode",
  "daily.dev"
];

export default function BuiltInSchool() {
  return (
    <section
      id="built-in-school"
      className="w-full border-t-[0.5px] border-t-[var(--color-border)] py-[72px]"
    >
      <div className="container">
        <p className="font-bebas mb-6 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9a9890]">
          BUILT IN SCHOOL
        </p>

        <div>
          {schoolProjects.map((project, index) => (
            <article
              key={project.name}
              className={`py-7 ${
                index > 0 ? "border-t-[0.5px] border-t-[var(--color-border)]" : ""
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <h3 className="font-jost text-[16px] font-semibold leading-[1.8] text-[#1a1a18]">
                  {project.name}
                </h3>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-light leading-[1.85] text-[#9a9890] transition-colors duration-200 ease-in-out hover:text-[#c84b2f]"
                >
                  {project.displayUrl}
                </a>
              </div>

              <p className="mb-[18px] mt-3 max-w-[840px] text-[15px] font-light leading-[1.85] text-[#3a3a38]">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-6 md:gap-10">
                {project.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-bebas text-[28px] font-bold leading-[1.4] text-[#1a1a18]">
                      {stat.value}
                    </p>
                    <p className="font-jost mt-[3px] text-[11px] font-normal uppercase tracking-[0.1em] text-[#9a9890]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}

          <div className="border-t-[0.5px] border-t-[var(--color-border)] pt-7">
            <h3 className="font-bebas mb-6 text-[13px] font-medium uppercase tracking-[0.1em] text-[#9a9890]">
              Writing
            </h3>
            <p className="mb-5 max-w-[860px] text-[15px] font-light leading-[1.85] text-[#3a3a38]">
              Technical content that front-paged Hacker News, hit 80k+ readers
              on freeCodeCamp, and was named Author of the Week on Hashnode and
              daily.dev.
            </p>

            <p className="text-[13px] font-light leading-[1.85] text-[#9a9890]">
              {writingBadges.join(" \u00B7 ")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
