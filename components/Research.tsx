import Section from "@/components/Section";

const researchEntries = [
  {
    title: "EdgeLM",
    href: "https://github.com/chayprabs/edgeLM",
    meta: "Independent",
    status: "In progress",
    description:
      "A C inference engine, written from scratch, pushing 3B-parameter LLMs to 100-120 tok/s on consumer Intel hardware with no discrete GPU. The same hardware manages 5-7 tok/s today. It combines BitNet 1.58-bit ternary quantization, hand-tuned AVX2/AVX-VNNI SIMD kernels, and hybrid CPU plus iGPU compute, and it is the foundation for an upcoming research paper."
  },
  {
    title: "Can LLMs Be Computers?",
    meta: "Under the supervision of Dr. Dhruv Kumar · CSIS Department, BITS Pilani",
    status: "In progress",
    description:
      "An ongoing research collaboration on whether LLMs can natively replicate classical computing primitives. I'm exploring 2D grid transformers, cutting attention complexity from O(n\u00b2) to O(n log n), and whether transformer architectures can simulate deterministic state machines."
  }
];

export default function Research() {
  return (
    <Section id="research" title="Research" intro="The questions underneath the products.">
      {researchEntries.map((entry) => (
        <article key={entry.title} className="entry">
          <div className="entry-head">
            <h3 className="entry-title">{entry.title}</h3>
            <span className="leader" aria-hidden="true" />
            <span className="entry-aside progress-wrap">
              <span className="progress" aria-hidden="true">
                <span />
              </span>
              {entry.status}
            </span>
          </div>

          <p className="entry-meta">
            {entry.meta}
            {entry.href ? (
              <>
                {" · "}
                <a
                  href={entry.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${entry.title} GitHub repository`}
                  className="link"
                >
                  GitHub
                </a>
              </>
            ) : null}
          </p>

          <p className="entry-text">{entry.description}</p>
        </article>
      ))}
    </Section>
  );
}
