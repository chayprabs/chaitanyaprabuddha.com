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
      className="w-full border-t-[0.5px] border-t-[rgba(0,0,0,0.07)] px-5 py-[72px] md:px-10"
    >
      <p className="mb-8 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
        RESEARCH
      </p>

      <div>
        {researchEntries.map((entry, index) => (
          <article
            key={entry.title}
            className={`${index !== 0 ? "border-t-[0.5px] border-t-[rgba(0,0,0,0.07)]" : ""} py-6`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-[15px] font-medium text-[#1a1a18] [font-family:var(--font-satoshi)]">
                  {entry.title}
                </h3>
                <p className="mb-[10px] mt-1 text-[12px] text-[#a09d95] [font-family:var(--font-satoshi)]">
                  {entry.meta}
                </p>
                <p className="max-w-[920px] text-[13px] leading-[1.7] text-[#6b6960] [font-family:var(--font-satoshi)]">
                  {entry.description}
                </p>
              </div>

              <span className="inline-flex w-fit shrink-0 rounded-[20px] bg-[#EDEAE3] px-[10px] py-[3px] text-[11px] text-[#a09d95] [font-family:var(--font-satoshi)]">
                Work in progress
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
