const achievements = [
  {
    placement: "1st",
    name: "Solve for Pilani",
    org: "BITS Pilani - Apogee Fest",
    description:
      "Marketed a professor's campus bakery at Apogee fest, generating INR 3L+ revenue in 5 days - with the lowest average order value product in the room, against teams selling fast fashion and jewellery."
  },
  {
    placement: "3rd",
    name: "BITSpreneur",
    org: "BITS Pilani",
    description:
      "Built Gurja, a bio-CNG solution converting campus mess food waste into energy. Placed 3rd - and the idea got picked up by Blue Chip Food Management and has been operational on campus since 2025."
  }
];

export default function Achievements() {
  return (
    <section
      id="achievements"
      className="w-full border-t-[0.5px] border-t-[rgba(0,0,0,0.07)] px-5 py-[72px] md:px-10"
    >
      <p className="mb-8 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
        ACHIEVEMENTS
      </p>

      <div>
        {achievements.map((achievement, index) => (
          <article
            key={achievement.name}
            className={`grid gap-6 border-t-[0.5px] border-t-[rgba(0,0,0,0.07)] py-7 md:grid-cols-[120px_1fr] md:gap-8 ${
              index === achievements.length - 1
                ? "border-b-[0.5px] border-b-[rgba(0,0,0,0.07)]"
                : ""
            }`}
          >
            <div>
              <p className="text-[28px] leading-none text-[#1a1a18] [font-family:var(--font-serif)]">
                {achievement.placement}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.06em] text-[#a09d95] [font-family:var(--font-satoshi)]">
                Place
              </p>
            </div>

            <div>
              <h3 className="text-[15px] font-medium text-[#1a1a18] [font-family:var(--font-satoshi)]">
                {achievement.name}
              </h3>
              <p className="mb-2 mt-1 text-[12px] text-[#a09d95] [font-family:var(--font-satoshi)]">
                {achievement.org}
              </p>
              <p className="text-[14px] leading-[1.7] text-[#4a4842] [font-family:var(--font-satoshi)]">
                {achievement.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
