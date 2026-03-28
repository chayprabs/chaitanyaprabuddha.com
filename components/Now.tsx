const LEVEL_STYLES = {
  0: "bg-[#E8E4DC]",
  1: "bg-[#C8D9A0]",
  2: "bg-[#8BBF56]",
  3: "bg-[#4A8A1E]"
} as const;

const LEVEL_LABELS = {
  0: "routine day",
  1: "read something new",
  2: "went deep on something",
  3: "something clicked"
} as const;

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

function seededRandom(week: number, day: number) {
  const value = Math.sin((week + 1) * 12.9898 + (day + 1) * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function getLevel(week: number, day: number) {
  const noise = seededRandom(week, day);
  const recentBias = week >= 33 ? 0.22 : week >= 30 ? 0.12 : 0;
  const adjusted = Math.min(noise + recentBias, 0.999);

  if (adjusted > 0.84) return 3;
  if (adjusted > 0.62) return 2;
  if (adjusted > 0.41) return 1;
  return 0;
}

const cells = Array.from({ length: 36 * 7 }, (_, index) => {
  const week = Math.floor(index / 7);
  const day = index % 7;

  return {
    key: `${week}-${day}`,
    level: getLevel(week, day)
  };
});

export default function Now() {
  return (
    <section
      id="now"
      className="w-full py-[48px]"
    >
      <div className="container">
        <p className="section-label mb-4">
          NOW
        </p>

        <p className="font-bebas mb-4 text-[13px] font-light leading-[1.85] text-[#9a9890]">
          days something clicked
        </p>

        <div className="overflow-x-auto">
          <div
            className="grid w-fit gap-1"
            style={{
              gridTemplateColumns: "repeat(36, 13px)",
              gridTemplateRows: "repeat(7, 13px)"
            }}
          >
            {cells.map((cell) => (
              <div key={cell.key} className="group relative">
                <div
                  className={`h-[13px] w-[13px] cursor-pointer rounded-[2px] ${LEVEL_STYLES[cell.level as keyof typeof LEVEL_STYLES]}`}
                />
                <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[2px] border-[0.5px] border-[rgba(0,0,0,0.2)] bg-[#fafaf8] px-2 py-1 text-[11px] text-[#1a1a18] opacity-0 transition-opacity duration-150 ease-in-out group-hover:opacity-100">
                  {LEVEL_LABELS[cell.level as keyof typeof LEVEL_LABELS]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-light text-[#9a9890]">
          <span>Less</span>
          <span className="h-[13px] w-[13px] rounded-[2px] bg-[#E8E4DC]" />
          <span className="h-[13px] w-[13px] rounded-[2px] bg-[#C8D9A0]" />
          <span className="h-[13px] w-[13px] rounded-[2px] bg-[#8BBF56]" />
          <span className="h-[13px] w-[13px] rounded-[2px] bg-[#4A8A1E]" />
          <span>More</span>
          <span className="ml-2">
            0 = routine / 1 = read something / 2 = went deep / 3 = something
            clicked
          </span>
        </div>

        <div className="my-8" />

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
