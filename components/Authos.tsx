const stats = [
  { label: "Status", value: "In alpha" },
  { label: "Stack", value: "AI · LLMs · Agents" },
  { label: "Built for", value: "Founders · SaaS · Indies" }
];

export default function Authos() {
  return (
    <section
      id="authos"
      className="w-full border-t border-black/[0.07] px-10 py-[72px]"
    >
      <p className="mb-8 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
        AUTHOS
      </p>

      <div className="rounded-[12px] border border-black/[0.12] bg-[#FDFAF5] px-[30px] py-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-[26px] text-[#1a1a18] [font-family:var(--font-serif)]">
              Authos
            </h2>
            <p className="mt-2 max-w-[420px] text-[14px] leading-[1.6] text-[#6b6960] [font-family:var(--font-satoshi)]">
              SEO is still slow, still manual, and still a full time job for
              most teams. Authos replaces it entirely.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-[20px] bg-[#EDE8DF] px-3 py-1 text-[11px] text-[#7a6b4e] [font-family:var(--font-satoshi)]">
            Founder
          </span>
        </div>

        <div className="my-6 border-t border-black/[0.12]" />

        <p className="text-[14px] leading-[1.7] text-[#4a4842] [font-family:var(--font-satoshi)]">
          An autonomous SEO and GEO agent that handles the full content
          pipeline using LLMs, built for indie hackers, founders, and SaaS
          companies who want to rank without thinking about it.
        </p>

        <div className="my-6 border-t border-black/[0.12]" />

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-5 md:flex-row md:flex-wrap md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
                  {stat.label}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[#1a1a18] [font-family:var(--font-satoshi)]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-[20px] bg-[#E0EDD8] px-3 py-[5px] text-[12px] text-[#3a6b3a] [font-family:var(--font-satoshi)]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#4a8a1e]" />
              Live in alpha
            </span>

            <a
              href="#contact"
              className="border-b border-black/20 pb-px text-[13px] text-[#6b6960] transition-colors duration-200 ease-in-out hover:text-[#1a1a18] [font-family:var(--font-satoshi)]"
            >
              Join waitlist →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
