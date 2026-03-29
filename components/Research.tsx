const researchEntries = [
  {
    title: "EdgeLM",
    href: "https://github.com/chayprabs/edgeLM",
    meta: "Independent",
    status: "In progress",
    description:
      "A from-scratch C inference engine pushing 3B-parameter LLMs to 100-120 tok/s on consumer Intel hardware - no discrete GPU. Combines BitNet 1.58-bit ternary quantization, hand-tuned AVX2/AVX-VNNI SIMD kernels, and hybrid CPU plus iGPU compute on hardware that currently manages 5-7 tok/s. Foundation for an upcoming research paper."
  },
  {
    title: "Can LLMs Be Computers?",
    meta: "Under the supervision of Dr. Dhruv Kumar · CSIS Department, BITS Pilani",
    status: "In progress",
    description:
      "An ongoing research collaboration investigating whether LLMs can natively replicate classical computing primitives - exploring 2D grid transformers, attention complexity reduction from O(n²) to O(n log n), and whether transformer architectures can simulate deterministic state machines."
  }
];

export default function Research() {
  return (
    <section
      id="research"
      className="w-full py-[48px]"
    >
      <div className="container">
        <p className="section-label mb-4">
          RESEARCH
        </p>

        <div>
          {researchEntries.map((entry, index) => (
            <article
              key={entry.title}
              className={`${
                index > 0 ? "border-t-[0.5px] border-t-[var(--color-border)]" : ""
              }`}
            >
              <div className="rounded-[8px] border-[0.5px] border-transparent bg-transparent p-4 transition-all duration-200 ease-in-out hover:border-[rgba(0,0,0,0.1)] hover:bg-[#EDEAE5]">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-jost text-[16px] font-semibold leading-[1.8] text-[#1a1a18]">
                      {entry.title}
                    </h3>

                    {entry.href ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[12px] font-light text-[#9a9890]">
                          {entry.status}
                        </span>
                        <a
                          href={entry.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${entry.title} GitHub repository`}
                          className="text-[#9a9890] transition-colors duration-200 ease-in-out hover:text-[#1a1a18]"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                            className="h-[18px] w-[18px]"
                          >
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                        </a>
                      </div>
                    ) : (
                      <span className="shrink-0 text-[12px] font-light text-[#9a9890]">
                        {entry.status}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[12px] font-light leading-[1.85] text-[#9a9890]">
                    {entry.meta}
                  </p>

                  <p className="mt-3 max-w-[920px] text-[15px] font-light leading-[1.85] text-[#3a3a38]">
                    {entry.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
