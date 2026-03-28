const schoolProjects = [
  {
    name: "Developernoon",
    url: "developernoon.com",
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
    url: "trymonial.app",
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
  { label: "Hacker News", dot: "#ff6600", text: "#cc4b00" },
  { label: "freeCodeCamp", dot: "#006400", text: "#006400" },
  { label: "Hashnode", dot: "#2563eb", text: "#2563eb" },
  { label: "daily.dev", dot: "#1a1a18", text: "#1a1a18" }
];

export default function BuiltInSchool() {
  return (
    <section
      id="built-in-school"
      className="w-full border-t border-black/[0.07] px-10 py-[72px]"
    >
      <p className="mb-10 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
        BUILT IN SCHOOL
      </p>

      <div>
        {schoolProjects.map((project) => (
          <article
            key={project.name}
            className="border-t border-black/[0.07] py-7"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <h3 className="text-[15px] font-medium text-[#1a1a18] [font-family:var(--font-satoshi)]">
                {project.name}
              </h3>
              <span className="text-[12px] text-[#a09d95] [font-family:var(--font-satoshi)]">
                {project.url}
              </span>
            </div>

            <p className="mt-3 mb-[18px] max-w-[840px] text-[14px] leading-[1.7] text-[#4a4842] [font-family:var(--font-satoshi)]">
              {project.description}
            </p>

            <div className="flex flex-col gap-6 md:flex-row md:flex-wrap md:gap-10">
              {project.stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-[22px] text-[#1a1a18] [font-family:var(--font-serif)]">
                    {stat.value}
                  </p>
                  <p className="mt-[3px] text-[11px] uppercase tracking-[0.06em] text-[#a09d95] [font-family:var(--font-satoshi)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}

        <div className="border-t border-black/[0.07] pt-7">
          <h3 className="mb-[10px] text-[15px] font-medium text-[#1a1a18] [font-family:var(--font-satoshi)]">
            Writing
          </h3>
          <p className="mb-5 max-w-[860px] text-[14px] leading-[1.7] text-[#4a4842] [font-family:var(--font-satoshi)]">
            Technical content that front-paged Hacker News, hit 80k+ readers
            on freeCodeCamp, and was named Author of the Week on Hashnode and
            daily.dev.
          </p>

          <div className="flex flex-nowrap gap-[10px] overflow-x-auto pb-1">
            {writingBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-[7px] whitespace-nowrap rounded-[20px] border border-black/[0.12] bg-[#FDFAF5] px-[14px] py-[7px] text-[12px] font-medium"
                style={{ color: badge.text }}
              >
                <span
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: badge.dot }}
                />
                <span className="[font-family:var(--font-satoshi)]">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
