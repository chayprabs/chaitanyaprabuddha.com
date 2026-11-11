import Section from "@/components/Section";

function Status() {
  return (
    <span className="entry-aside progress-wrap">
      <span className="progress" aria-hidden="true">
        <span />
      </span>
      In progress
    </span>
  );
}

export default function Research() {
  return (
    <Section id="research" title="Research">
      <article className="entry">
        <div className="entry-head">
          <h3 className="entry-title">EdgeLM</h3>
          <span className="leader" aria-hidden="true" />
          <Status />
        </div>

        <p className="entry-meta">
          Independent {"·"}{" "}
          <a
            href="https://github.com/chayprabs/edgeLM"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="EdgeLM GitHub repository"
            className="link"
          >
            GitHub
          </a>
        </p>

        <p className="entry-text">
          <i>
            The goal: a 3B-parameter LLM at 100{"–"}120 tokens a second on
            consumer Intel hardware with no discrete GPU.
          </i>{" "}
          The same hardware manages 5{"–"}7 today. EdgeLM is an inference
          engine I&rsquo;m writing from scratch in C, using BitNet 1.58-bit
          ternary weights, hand-tuned AVX2 and AVX-VNNI kernels, and the CPU
          and integrated GPU together. It is the basis for an upcoming paper.
        </p>
      </article>

      <article className="entry">
        <div className="entry-head">
          <h3 className="entry-title">Can LLMs Be Computers?</h3>
          <span className="leader" aria-hidden="true" />
          <Status />
        </div>

        <p className="entry-meta">
          With Dr. Dhruv Kumar {"·"} CSIS Department, BITS Pilani
        </p>

        <p className="entry-text">
          <i>
            Can a transformer do what a computer does, exactly and every time?
          </i>{" "}
          I&rsquo;m testing whether LLMs can natively reproduce classical
          computing primitives: 2D grid transformers, attention that scales as
          O(n&nbsp;log&nbsp;n) instead of O(n{"²"}), and architectures that
          simulate deterministic state machines.
        </p>
      </article>
    </Section>
  );
}
