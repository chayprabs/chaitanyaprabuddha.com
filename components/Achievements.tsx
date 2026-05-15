const achievements = [
  {
    tone: "silver",
    placement: "2nd Place",
    name: "Eightfold AI Hackathon",
    org: "Eightfold AI - Apogee Fest 2026, BITS Pilani",
    description: (
      <>
        Built{" "}
        <a
          href="https://github.com/chayprabs/candor"
          target="_blank"
          rel="noopener noreferrer"
          className="border-b border-[#1a1a18] pb-[1px] text-[#1a1a18] transition-colors duration-150 ease-in-out hover:text-[#6b6860]"
        >
          Candor
        </a>
        , an agentic interview integrity system that detects AI-agent
        assistance during interviews to make hiring fairer and more reliable. I
        competed solo among 700+ teams and finished 2nd.
      </>
    )
  },
  {
    tone: "blue",
    placement: "Featured Builder",
    name: "OpenAI Codex Hackathon",
    org: "OpenAI x GrowthX - Bengaluru",
    description: (
      <>
        Selected for{" "}
        <a
          href="https://luma.com/x495vdw1?tk=AWqy9y&utm_source=growthx"
          target="_blank"
          rel="noopener noreferrer"
          className="border-b border-[#1a1a18] pb-[1px] text-[#1a1a18] transition-colors duration-150 ease-in-out hover:text-[#6b6860]"
        >
          OpenAI Codex Hackathon - Bengaluru
        </a>
        , India&apos;s first Codex hackathon, from 5,000+ applicants into a
        100-builder offline cohort. Built{" "}
        <a
          href="https://github.com/chayprabs/codex-hack-bengaluru"
          target="_blank"
          rel="noopener noreferrer"
          className="border-b border-[#1a1a18] pb-[1px] text-[#1a1a18] transition-colors duration-150 ease-in-out hover:text-[#6b6860]"
        >
          codex-hack-bengaluru
        </a>{" "}
        in a one-day sprint focused on agentic coding, developer tools, and
        AI-native product workflows.
      </>
    )
  },
  {
    tone: "slate",
    placement: "Top 10",
    name: "ContextCon",
    org: "Crustdata x Y Combinator - Bengaluru",
    description: (
      <>
        Selected among the top 100 participants from roughly 2,000 applicants
        for{" "}
        <a
          href="https://luma.com/6ftay6mq"
          target="_blank"
          rel="noopener noreferrer"
          className="border-b border-[#1a1a18] pb-[1px] text-[#1a1a18] transition-colors duration-150 ease-in-out hover:text-[#6b6860]"
        >
          ContextCon
        </a>
        , Crustdata&apos;s YC-partnered hackathon for developers, AI agent
        builders, and technical founders. Built{" "}
        <a
          href="https://github.com/chayprabs/contextkings"
          target="_blank"
          rel="noopener noreferrer"
          className="border-b border-[#1a1a18] pb-[1px] text-[#1a1a18] transition-colors duration-150 ease-in-out hover:text-[#6b6860]"
        >
          ContextKings
        </a>{" "}
        with Crustdata APIs in a 6-hour sprint and finished in the top 10.
      </>
    )
  },
  {
    tone: "gold",
    placement: "1st Place",
    name: "Solve for Pilani",
    org: "BITS Pilani - Apogee Fest 2025",
    description:
      "Marketed a professor's campus bakery at BITS Pilani's Apogee Fest and generated \u20b93L+ revenue in 5 days - with the lowest average order value in the room. Every other team ran cash only. We didn't."
  },
  {
    tone: "bronze",
    placement: "3rd Place",
    name: "BITSpreneur",
    org: "BITS Pilani",
    description:
      "Built Gurja, a bio-CNG system converting campus mess food waste into usable energy. Placed 3rd - then watched the idea get picked up by Blue Chip Food Management and go live on campus in 2025. The competition ended. The project didn't."
  }
];

export default function Achievements() {
  return (
    <section
      id="achievements"
      className="w-full py-[48px]"
    >
      <div className="container">
        <p className="section-label mb-4">
          ACHIEVEMENTS
        </p>

        <div>
          {achievements.map((achievement, index) => (
            <article
              key={achievement.name}
              className={`${
                index > 0 ? "border-t-[0.5px] border-t-[var(--color-border)]" : ""
              }`}
            >
              <div className="rounded-[8px] border-[0.5px] border-transparent bg-transparent p-4 transition-all duration-200 ease-in-out hover:border-[rgba(0,0,0,0.1)] hover:bg-[#EDEAE5]">
                <div className="mb-[6px] flex items-center justify-between gap-4">
                  <h3 className="font-jost text-[15px] font-semibold text-[#1a1a18]">
                    {achievement.name}
                  </h3>

                  <span
                    className={`inline-flex shrink-0 items-center gap-[5px] rounded-[20px] px-[10px] py-1 text-[11px] font-normal ${
                      achievement.tone === "gold"
                        ? "border-[0.5px] border-[rgba(201,168,76,0.3)] bg-[#FDF8ED] text-[#9a7c2a]"
                        : achievement.tone === "silver"
                          ? "border-[0.5px] border-[rgba(120,128,140,0.3)] bg-[#F7F7F4] text-[#6f747b]"
                          : achievement.tone === "blue"
                            ? "border-[0.5px] border-[rgba(37,99,235,0.24)] bg-[#EEF4FF] text-[#315fa8]"
                          : achievement.tone === "slate"
                            ? "border-[0.5px] border-[rgba(74,92,110,0.25)] bg-[#F2F5F6] text-[#4a5c6e]"
                        : "border-[0.5px] border-[rgba(160,120,90,0.3)] bg-[#FAF4F0] text-[#7a5a3a]"
                    }`}
                  >
                    {achievement.tone === "gold" ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="6" fill="#C9A84C" />
                        <path d="M8 14l-3 7h14l-3-7" fill="#C9A84C" opacity="0.6" />
                        <circle cx="12" cy="8" r="3.5" fill="#F0C93A" />
                      </svg>
                    ) : achievement.tone === "silver" ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="6" fill="#9AA1AA" />
                        <path d="M8 14l-3 7h14l-3-7" fill="#9AA1AA" opacity="0.6" />
                        <circle cx="12" cy="8" r="3.5" fill="#C9CED4" />
                      </svg>
                    ) : achievement.tone === "blue" ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="6" fill="#4F83D1" />
                        <path d="M8 14l-3 7h14l-3-7" fill="#4F83D1" opacity="0.55" />
                        <circle cx="12" cy="8" r="3.5" fill="#A9C8F7" />
                      </svg>
                    ) : achievement.tone === "slate" ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="6" fill="#6F7F8F" />
                        <path d="M8 14l-3 7h14l-3-7" fill="#6F7F8F" opacity="0.55" />
                        <circle cx="12" cy="8" r="3.5" fill="#A7B1BC" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="6" fill="#A0785A" />
                        <path d="M8 14l-3 7h14l-3-7" fill="#A0785A" opacity="0.6" />
                        <circle cx="12" cy="8" r="3.5" fill="#C49278" />
                      </svg>
                    )}
                    {achievement.placement}
                  </span>
                </div>

                <p className="mb-2 text-[12px] font-light text-[#9a9890]">
                  {achievement.org}
                </p>

                <p className="text-[14px] font-light leading-[1.7] text-[#3a3a38]">
                  {achievement.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
