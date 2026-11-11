import Section from "@/components/Section";

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
    <Section id="research" title="Research">
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
