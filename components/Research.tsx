const researchEntries = [
  {
    title: "EdgeLM",
    meta: "Independent - github.com/chayprabs/edgelm",
    description:
      "A from-scratch C inference engine targeting 100-120 tok/s on consumer Intel hardware, no discrete GPU required. Combines BitNet 1.58-bit ternary quantization, hand-tuned AVX2/AVX-VNNI SIMD kernels, and hybrid CPU plus iGPU compute to push 3B-parameter LLMs on hardware that currently manages 5-7 tok/s with standard tools. Doubles as the foundation for a research paper."
  },
  {
    title: "Can Computers Be LLMs?",
    meta: "Under supervision of Dr. Dhruv Kumar - CSIS Department, BITS Pilani",
    description:
      "An ongoing research collaboration exploring whether classical computing architectures can natively exhibit LLM-like behaviour and what that implies for how we think about intelligence in machines."
  }
];

export default function Research() {
  return (
    <section
      id="research"
      className="w-full border-t-[0.5px] border-t-[var(--color-border)] py-[72px]"
    >
      <div className="container">
        <p className="font-bebas mb-6 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9a9890]">
          RESEARCH
        </p>

        <div>
          {researchEntries.map((entry, index) => (
            <article
              key={entry.title}
              className={`py-6 transition-colors duration-150 ease-in-out hover:bg-[rgba(0,0,0,0.02)] ${
                index > 0 ? "border-t-[0.5px] border-t-[var(--color-border)] " : ""
              }${
                index === researchEntries.length - 1
                  ? "border-b-[0.5px] border-b-[var(--color-border)]"
                  : ""
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-jost text-[16px] font-semibold leading-[1.8] text-[#1a1a18]">
                    {entry.title}
                  </h3>
                  <p className="mb-[10px] mt-1 text-[13px] font-light leading-[1.85] text-[#9a9890]">
                    {entry.meta}
                  </p>
                  <p className="max-w-[920px] text-[15px] font-light leading-[1.85] text-[#3a3a38]">
                    {entry.description}
                  </p>
                </div>

                <span className="w-fit shrink-0 text-[12px] font-light text-[#9a9890]">
                  In progress
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
