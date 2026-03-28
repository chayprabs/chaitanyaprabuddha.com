export default function Authos() {
  return (
    <section
      id="authos"
      className="w-full py-[48px]"
    >
      <div className="container">
        <div className="rounded-[6px] bg-[#ECEAE5] px-[28px] py-[24px]">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-[520px]">
              <h2 className="mb-1 text-[20px] font-semibold leading-tight text-[#1a1a18]">
                Authos
              </h2>
              <p className="text-[15px] font-normal leading-[1.7] text-[#6b6860]">
                SEO is still slow, still manual, and still a full time job for
                most teams. Authos replaces it entirely.
              </p>
              <p className="mt-2 text-[14px] font-light leading-[1.8] text-[#6b6860]">
                An autonomous SEO and GEO agent that handles the full content
                pipeline using LLMs, built for indie hackers, founders, and
                SaaS companies who want to rank without thinking about it.
              </p>
            </div>

            <span className="shrink-0 text-[12px] font-normal text-[#9a9890]">
              Founder
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[13px] font-light leading-[1.8] text-[#9a9890]">
              Founders · SaaS · Indies
            </p>

            <div className="flex shrink-0 items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[12px] font-normal text-[#4a8a1e]">
                <span className="h-[6px] w-[6px] rounded-full bg-[#4a8a1e]" />
                Live in alpha
              </span>

              <a
                href="#contact"
                className="rounded-[4px] border border-[rgba(0,0,0,0.2)] bg-transparent px-[14px] py-[6px] text-[12px] font-normal text-[#1a1a18] transition-colors duration-150 ease-in-out hover:bg-[rgba(0,0,0,0.04)]"
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
