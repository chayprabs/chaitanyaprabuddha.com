const infoColumns = [
  {
    label: "MUSIC",
    text: "Beatles to Bob Dylan to Peter Cat Recording Co at 2am. Rock, pop, and anything with a soul in it."
  },
  {
    label: "CHESS",
    text: "1600 on chess.com. Decent enough to enjoy it, humble enough to lose interestingly. Play me sometime."
  },
  {
    label: "BOOKS",
    text: "Currently: Sapiens. Generally: biographies, anything that reframes how I see things."
  }
];

export default function Now() {
  return (
    <section
      id="beyondthecode"
      className="w-full py-[48px]"
    >
      <div className="container">
        <p className="section-label mb-4">
          BEYOND THE CODE
        </p>

        <p
          className="mb-6 text-[22px] italic text-[#9a9890] md:text-[26px]"
          style={{ fontFamily: "var(--font-caveat)" }}
        >
          When I&apos;m not building &mdash;
        </p>

        <div className="mb-7 h-[0.5px] w-full bg-[rgba(0,0,0,0.08)]" />

        <div className="grid gap-0 md:grid-cols-3 md:gap-10">
          {infoColumns.map((column, index) => (
            <div
              key={column.label}
              className={`${index > 0 ? "border-t-[0.5px] border-t-[rgba(0,0,0,0.08)]" : ""} py-4 md:border-t-0 md:py-0`}
            >
              <p className="font-jost mb-[10px] text-[11px] font-normal uppercase tracking-[0.12em] text-[#9a9890]">
                {column.label}
              </p>
              <p className="text-[14px] font-light leading-[1.8] text-[#6b6860]">
                {column.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
