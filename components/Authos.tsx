import { Mail } from "lucide-react";

export default function Authos() {
  return (
    <section
      id="authos"
      className="w-full py-[48px]"
    >
      <div className="container">
        <div className="box-border w-full rounded-[6px] bg-[#ECEAE5] p-4 md:px-[28px] md:py-[24px]">
          <div className="flex items-start justify-between gap-6">
            <h2 className="mb-1 text-[20px] font-semibold leading-tight text-[#1a1a18]">
              Authos
            </h2>

            <span className="shrink-0 text-[12px] font-normal text-[#9a9890]">
              Founder &amp; CEO
            </span>
          </div>

          <p className="mb-4 mt-5 w-full text-[16px] font-medium leading-[1.5] text-[#1a1a18]">
            Search is changing faster than most marketing teams can keep up.
            Authos is built for what comes next.
          </p>

          <p className="mb-0 w-full text-[14px] font-light leading-[1.75] text-[#6b6860]">
            An autonomous SEO and GEO agent that handles the full content and
            visibility pipeline - from traditional search rankings to getting
            cited by AI models like ChatGPT and Claude. Built for founders and
            small teams who can&apos;t afford to fall behind.
          </p>

          <div className="mt-4 flex flex-col items-start gap-[10px] md:flex-row md:items-center md:justify-between">
            <p className="w-full text-[13px] font-light leading-[1.8] text-[#9a9890] md:w-auto">
              Founders · SMBs · Indie Hackers
            </p>

            <div className="flex shrink-0 flex-wrap items-center gap-[10px] md:gap-3">
              <span className="text-[12px] font-normal text-[#4a8a1e]">
                Live in alpha
              </span>

              <a
                href="#contact"
                className="rounded-[4px] border border-[rgba(0,0,0,0.2)] bg-transparent px-[12px] py-[5px] text-[12px] font-normal text-[#1a1a18] transition-colors duration-150 ease-in-out hover:bg-[rgba(0,0,0,0.04)]"
              >
                Join waitlist &rarr;
              </a>

              <div className="group relative">
                <a
                  href="mailto:authos@chaitanyaprabuddha.com"
                  title="Ask about Authos"
                  aria-label="Ask about Authos"
                  className="text-[#9a9890] transition-colors duration-150 ease-in-out hover:text-[#1a1a18]"
                >
                  <Mail size={15} />
                </a>

                <span className="pointer-events-none absolute bottom-[24px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-[#1a1a18] px-[8px] py-[3px] text-[10px] text-[#FAFAF8] opacity-0 transition-opacity duration-150 ease-in-out group-hover:opacity-100">
                  Ask about Authos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
