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
  const level = getLevel(week, day);

  return {
    key: `${week}-${day}`,
    level
  };
});

export default function Now() {
  return (
    <section id="now" className="w-full border-t border-black/[0.07] px-10 py-[72px]">
      <p className="mb-8 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
        NOW
      </p>

      <p className="mb-4 text-[13px] text-[#6b6960] [font-family:var(--font-satoshi)]">
        days something clicked
      </p>

      <div className="overflow-x-auto">
        <div className="grid w-fit grid-flow-col grid-cols-[repeat(36,13px)] grid-rows-7 gap-1">
          {cells.map((cell) => (
            <div key={cell.key} className="group relative">
              <div
                className={`h-[13px] w-[13px] cursor-pointer rounded-[2px] ${LEVEL_STYLES[cell.level as keyof typeof LEVEL_STYLES]}`}
              />
              <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[8px] bg-[#1a1a18] px-2 py-1 text-[11px] text-[#F7F4EE] opacity-0 transition-opacity duration-150 ease-in-out group-hover:opacity-100 [font-family:var(--font-satoshi)]">
                {LEVEL_LABELS[cell.level as keyof typeof LEVEL_LABELS]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[#a09d95] [font-family:var(--font-satoshi)]">
        <span>Less</span>
        <span className="h-[13px] w-[13px] rounded-[2px] bg-[#E8E4DC]" />
        <span className="h-[13px] w-[13px] rounded-[2px] bg-[#C8D9A0]" />
        <span className="h-[13px] w-[13px] rounded-[2px] bg-[#8BBF56]" />
        <span className="h-[13px] w-[13px] rounded-[2px] bg-[#4A8A1E]" />
        <span>More</span>
        <span className="ml-2">
          0 = routine · 1 = read something · 2 = went deep · 3 = something clicked
        </span>
      </div>

      <div className="my-12 border-t border-black/[0.07]" />

      <div className="grid gap-10 md:grid-cols-3">
        {infoColumns.map((column) => (
          <div key={column.label}>
            <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
              {column.label}
            </p>
            <p className="text-[14px] leading-[1.7] text-[#3d3b36] [font-family:var(--font-satoshi)]">
              {column.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
