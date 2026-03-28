const achievements = [
  {
    placement: "1st",
    color: "#c84b2f",
    name: "Solve for Pilani",
    org: "BITS Pilani - Apogee Fest",
    description:
      "Marketed a professor's campus bakery at Apogee fest, generating INR 3L+ revenue in 5 days - with the lowest average order value product in the room, against teams selling fast fashion and jewellery."
  },
  {
    placement: "3rd",
    color: "#1a1a18",
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
      className="w-full border-t-[0.5px] border-t-[var(--color-border)] py-[72px]"
    >
      <div className="container">
        <p className="font-bebas mb-6 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9a9890]">
          ACHIEVEMENTS
        </p>

        <div>
          {achievements.map((achievement, index) => (
            <article
              key={achievement.name}
              className={`grid gap-6 py-7 md:grid-cols-[120px_1fr] md:gap-8 ${
                index > 0 ? "border-t-[0.5px] border-t-[var(--color-border)] " : ""
              }${
                index === achievements.length - 1
                  ? "border-b-[0.5px] border-b-[var(--color-border)]"
                  : ""
              }`}
            >
              <div>
                <p
                  className="font-bebas text-[28px] leading-none"
                  style={{ color: achievement.color }}
                >
                  {achievement.placement}
                </p>
              </div>

              <div>
                <h3 className="font-jost text-[16px] font-semibold leading-[1.8] text-[#1a1a18]">
                  {achievement.name}
                </h3>
                <p className="mb-2 mt-1 text-[13px] font-light leading-[1.85] text-[#9a9890]">
                  {achievement.org}
                </p>
                <p className="text-[15px] font-light leading-[1.85] text-[#3a3a38]">
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
