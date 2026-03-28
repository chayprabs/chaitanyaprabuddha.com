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
    text: "Currently: Sapiens. Generally: biographies, anything that reframes how I see things. I read weird combinations and I'm not sorry."
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

        <div className="grid gap-10 md:grid-cols-3">
          {infoColumns.map((column) => (
            <div key={column.label}>
              <p className="font-jost mb-3 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9a9890]">
                {column.label}
              </p>
              <p className="text-[15px] font-light leading-[1.85] text-[#3a3a38]">
                {column.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
