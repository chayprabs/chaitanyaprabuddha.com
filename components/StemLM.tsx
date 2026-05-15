export default function StemLM() {
  return (
    <section
      id="stemlm"
      className="w-full pb-[48px] pt-0"
    >
      <div className="container">
        <div className="box-border w-full rounded-[6px] bg-[#ECEAE5] p-4 md:px-[28px] md:py-[24px]">
          <div className="flex items-start justify-between gap-6">
            <h2 className="mb-1 text-[20px] font-semibold leading-tight text-[#1a1a18]">
              StemLM
            </h2>

            <span className="shrink-0 text-[12px] font-normal text-[#9a9890]">
              Co-founder
            </span>
          </div>

          <p className="mb-4 mt-5 w-full text-[16px] font-medium leading-[1.5] text-[#1a1a18]">
            The structured way to solve STEM problems with AI.
          </p>

          <p className="mb-0 w-full text-[14px] font-light leading-[1.75] text-[#6b6860]">
            StemLM works alongside ChatGPT, Claude, and Gemini, adding the
            exact step-by-step framework each subject demands. It turns AI
            answers into curriculum-aligned study views with methods, formulas,
            diagrams, and the missing steps students actually need to
            understand.
          </p>

          <div className="mt-4 flex flex-col items-start gap-[10px] md:flex-row md:items-center md:justify-between">
            <p className="w-full text-[13px] font-light leading-[1.8] text-[#9a9890] md:w-auto">
              Undergrad students {"\u00b7"} Structured STEM solutions {"\u00b7"} Exam-ready understanding
            </p>

            <div className="flex shrink-0 flex-wrap items-center gap-[10px] md:gap-3">
              <a
                href="https://www.stemlm.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[4px] border border-[rgba(0,0,0,0.2)] bg-transparent px-[12px] py-[5px] text-[12px] font-normal text-[#1a1a18] transition-colors duration-150 ease-in-out hover:bg-[rgba(0,0,0,0.04)]"
              >
                Try StemLM &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
