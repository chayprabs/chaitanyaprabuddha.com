const stats = [
  { label: "Status", value: "In alpha" },
  { label: "Stack", value: "AI / LLMs / Agents" },
  { label: "Built for", value: "Founders / SaaS / Indies" }
];

export default function Authos() {
  return (
    <section
      id="authos"
      className="w-full border-t-[0.5px] border-t-[var(--color-border)] py-[72px]"
    >
      <div className="container">
        <p className="font-bebas mb-6 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9a9890]">
          AUTHOS
        </p>

        <div className="rounded-[8px] bg-[#ECEAE6] p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-[22px] font-bold leading-tight text-[#1a1a18]">
                Authos
              </h2>
              <p className="mt-2 max-w-[420px] text-[15px] font-light leading-[1.85] text-[#6b6860]">
                SEO is still slow, still manual, and still a full time job for
                most teams. Authos replaces it entirely.
              </p>
            </div>

            <span className="w-fit text-[12px] font-light text-[#9a9890]">
              Founder
            </span>
          </div>

          <div className="my-6 border-t-[0.5px] border-t-[var(--color-border)]" />

          <p className="text-[15px] font-light leading-[1.85] text-[#3a3a38]">
            An autonomous SEO and GEO agent that handles the full content
            pipeline using LLMs, built for indie hackers, founders, and SaaS
            companies who want to rank without thinking about it.
          </p>

          <div className="my-6 border-t-[0.5px] border-t-[var(--color-border)]" />

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-[11px] font-normal uppercase tracking-[0.1em] text-[#9a9890]">
                    {stat.label}
                  </p>
                  <p className="mt-1 whitespace-nowrap text-[15px] font-medium leading-[1.8] text-[#1a1a18]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="inline-flex items-center gap-2 rounded-[4px] bg-[#1a1a18] px-[14px] py-[6px] text-[12px] font-normal text-white">
                <span className="h-[6px] w-[6px] rounded-full bg-[#c84b2f]" />
                Live in alpha
              </span>

              <a
                href="#contact"
                className="text-[13px] font-normal text-[#1a1a18] transition-all duration-200 ease-in-out hover:underline"
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
