const achievements = [
  {
    tone: "gold",
    placement: "1st Place",
    name: "Solve for Pilani",
    org: "BITS Pilani - Apogee Fest",
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
              className={`py-5 ${
                index > 0 ? "border-t-[0.5px] border-t-[var(--color-border)]" : ""
              }`}
            >
              <div className="rounded-[6px] border-[0.5px] border-transparent p-4 transition-[background,border-color] duration-150 ease-in-out hover:border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.03)]">
                <div className="mb-[6px] flex items-center justify-between gap-4">
                  <h3 className="font-jost text-[15px] font-semibold text-[#1a1a18]">
                    {achievement.name}
                  </h3>

                  <span
                    className={`inline-flex shrink-0 items-center gap-[5px] rounded-[20px] px-[10px] py-1 text-[11px] font-normal ${
                      achievement.tone === "gold"
                        ? "border-[0.5px] border-[rgba(201,168,76,0.3)] bg-[#FDF8ED] text-[#9a7c2a]"
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
