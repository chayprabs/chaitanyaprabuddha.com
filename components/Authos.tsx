const stats = [
  { label: "Status", value: "In alpha" },
  { label: "Stack", value: "AI / LLMs / Agents" },
  { label: "Built for", value: "Founders / SaaS / Indies" }
];

export default function Authos() {
  return (
    <section
      id="authos"
      className="w-full border-t-[0.5px] border-t-[rgba(0,0,0,0.07)] px-5 py-[72px] md:px-10"
    >
      <p className="mb-8 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
        AUTHOS
      </p>

      <div className="rounded-[12px] border-[0.5px] border-[rgba(0,0,0,0.12)] bg-[var(--color-card)] px-5 py-7 transition-colors duration-200 ease-in-out hover:border-[rgba(0,0,0,0.22)] md:px-[30px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-[26px] leading-none text-[#1a1a18] [font-family:var(--font-serif)]">
              Authos
            </h2>
            <p className="mt-2 max-w-[420px] text-[14px] leading-[1.7] text-[#6b6960] [font-family:var(--font-satoshi)]">
              SEO is still slow, still manual, and still a full time job for
              most teams. Authos replaces it entirely.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-[20px] bg-[#EDE8DF] px-3 py-1 text-[11px] text-[#7a6b4e] [font-family:var(--font-satoshi)]">
            Founder
          </span>
        </div>

        <div className="my-6 border-t-[0.5px] border-t-[rgba(0,0,0,0.12)]" />

        <p className="text-[14px] leading-[1.7] text-[#4a4842] [font-family:var(--font-satoshi)]">
          An autonomous SEO and GEO agent that handles the full content
          pipeline using LLMs, built for indie hackers, founders, and SaaS
          companies who want to rank without thinking about it.
        </p>

        <div className="my-6 border-t-[0.5px] border-t-[rgba(0,0,0,0.12)]" />

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

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="inline-flex items-center gap-2 rounded-[20px] bg-[#E0EDD8] px-3 py-[5px] text-[12px] text-[#3a6b3a] [font-family:var(--font-satoshi)]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#4a8a1e]" />
              Live in alpha
            </span>

            <a
              href="#contact"
              className="border-b-[0.5px] border-b-[rgba(0,0,0,0.2)] pb-px text-[13px] text-[#6b6960] transition-colors duration-200 ease-in-out hover:text-[#1a1a18] [font-family:var(--font-satoshi)]"
            >
              Join waitlist &rarr;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
