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
      className="w-full border-t-[0.5px] border-t-[var(--color-border)] py-[88px]"
    >
      <div className="container">
        <p className="font-bebas mb-8 text-[11px] uppercase tracking-[0.15em] text-[#9a9890]">
          BUILT IN SCHOOL
        </p>

        <div>
          {schoolProjects.map((project) => (
            <article
              key={project.name}
              className="border-t-[0.5px] border-t-[var(--color-border)] py-7"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <h3 className="font-jost text-[16px] font-medium leading-[1.8] text-[#1a1a18]">
                  {project.name}
                </h3>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] leading-[1.8] text-[#6b6860] transition-colors duration-200 ease-in-out hover:text-[#c84b2f]"
                >
                  {project.displayUrl}
                </a>
              </div>

              <p className="mb-[18px] mt-3 max-w-[840px] text-[15px] leading-[1.8] text-[#1a1a18]">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-6 md:gap-10">
                {project.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-bebas text-[24px] font-normal leading-[1.4] text-[#1a1a18]">
                      {stat.value}
                    </p>
                    <p className="font-jost mt-[3px] text-[11px] uppercase tracking-[0.06em] text-[#9a9890]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}

          <div className="border-t-[0.5px] border-t-[var(--color-border)] pt-7">
            <h3 className="font-jost mb-[10px] text-[16px] font-medium leading-[1.8] text-[#1a1a18]">
              Writing
            </h3>
            <p className="mb-5 max-w-[860px] text-[15px] leading-[1.8] text-[#1a1a18]">
              Technical content that front-paged Hacker News, hit 80k+ readers
              on freeCodeCamp, and was named Author of the Week on Hashnode and
              daily.dev.
            </p>

            <div className="flex flex-nowrap gap-[10px] overflow-x-auto pb-1">
              {writingBadges.map((badge) => (
                <div
                  key={badge}
                  className="font-jost whitespace-nowrap rounded-[2px] border-[0.5px] border-[rgba(0,0,0,0.2)] bg-transparent px-[14px] py-[7px] text-[12px] font-normal text-[#1a1a18]"
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
