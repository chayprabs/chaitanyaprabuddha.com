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
              Founder
            </span>
          </div>

          <p className="mb-4 mt-5 w-full text-[16px] font-medium leading-[1.5] text-[#1a1a18]">
            Claude Code and Codex need reliable tools outside the prompt:
            remote execution that saves tokens, cuts setup cost, and improves
            accuracy.
          </p>

          <p className="mb-0 w-full text-[14px] font-light leading-[1.75] text-[#6b6860]">
            Authos runs browser sessions, Office and PDF conversion, large-file
            inspection, webhooks, sandboxes, temporary databases, logs, and
            artifact storage in controlled infrastructure, then returns
            structured JSON plus signed artifact links through one API and MCP
            layer.
          </p>

          <div className="mt-4 flex flex-col items-start gap-[10px] md:flex-row md:items-center md:justify-between">
            <p className="w-full text-[13px] font-light leading-[1.8] text-[#9a9890] md:w-auto">
              Agent builders {"\u00b7"} Developers {"\u00b7"} Engineering teams
            </p>

            <div className="flex shrink-0 flex-wrap items-center gap-[10px] md:gap-3">
              <a
                href="https://authors.app"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[4px] border border-[rgba(0,0,0,0.2)] bg-transparent px-[12px] py-[5px] text-[12px] font-normal text-[#1a1a18] transition-colors duration-150 ease-in-out hover:bg-[rgba(0,0,0,0.04)]"
              >
                Visit site &rarr;
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
