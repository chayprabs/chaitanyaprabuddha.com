const stats = [
  { label: "Status", value: "In alpha" },
  { label: "Stack", value: "AI / LLMs / Agents" },
  { label: "Built for", value: "Founders / SaaS / Indies" }
];

export default function Authos() {
  return (
    <section
      id="authos"
      className="w-full border-t-[0.5px] border-t-[var(--color-border)] py-[88px]"
    >
      <div className="container">
        <p className="font-bebas mb-8 text-[11px] uppercase tracking-[0.15em] text-[#9a9890]">
          AUTHOS
        </p>

        <div className="rounded-[4px] border-[0.5px] border-[rgba(0,0,0,0.15)] bg-[#f4f2ee] p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-jost text-[16px] font-semibold leading-[1.8] text-[#1a1a18]">
                Authos
              </h2>
              <p className="mt-2 max-w-[420px] text-[15px] leading-[1.8] text-[#1a1a18]">
                SEO is still slow, still manual, and still a full time job for
                most teams. Authos replaces it entirely.
              </p>
            </div>

            <span className="font-jost inline-flex w-fit rounded-[2px] border-[0.5px] border-[rgba(0,0,0,0.2)] bg-transparent px-3 py-1 text-[11px] text-[#6b6860]">
              Founder
            </span>
          </div>

          <div className="my-6 border-t-[0.5px] border-t-[var(--color-border)]" />

          <p className="text-[15px] leading-[1.8] text-[#1a1a18]">
            An autonomous SEO and GEO agent that handles the full content
            pipeline using LLMs, built for indie hackers, founders, and SaaS
            companies who want to rank without thinking about it.
          </p>

          <div className="my-6 border-t-[0.5px] border-t-[var(--color-border)]" />

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-6 md:grid-cols-3 md:gap-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-jost text-[11px] uppercase tracking-[0.15em] text-[#9a9890]">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-[24px] font-normal leading-[1.4] text-[#1a1a18]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="font-jost inline-flex items-center gap-2 rounded-[2px] border-[0.5px] border-[rgba(0,0,0,0.2)] bg-transparent px-3 py-[5px] text-[12px] text-[#6b6860]">
                <span className="h-[6px] w-[6px] rounded-full bg-[#c84b2f]" />
                Live in alpha
              </span>

              <a
                href="#contact"
                className="border-b-[0.5px] border-b-[rgba(0,0,0,0.2)] pb-px text-[13px] text-[#6b6860] transition-colors duration-200 ease-in-out hover:text-[#c84b2f]"
              >
                Join waitlist &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
