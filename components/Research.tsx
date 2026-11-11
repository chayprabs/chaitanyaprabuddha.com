import Section from "@/components/Section";

// Fig. 2: n² against n·log₂(n), drawn on one scale up to n = 64.
const PLOT = { width: 200, height: 104, max: 64 };

function curve(cost: (n: number) => number) {
  const top = PLOT.max * PLOT.max;

  return Array.from({ length: 33 }, (_, step) => {
    const n = (step / 32) * PLOT.max;
    const x = (n / PLOT.max) * PLOT.width;
    const y = PLOT.height - (cost(n) / top) * PLOT.height;

    return `${step === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

const QUADRATIC = curve((n) => n * n);
const LOG_LINEAR = curve((n) => (n > 1 ? n * Math.log2(n) : 0));

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

        <div className="research-body">
          <div>
            <p className="entry-text">
              <i>
                The goal: a 3B-parameter LLM at 100{"–"}120 tokens a second
                on consumer Intel hardware with no discrete GPU.
              </i>{" "}
              The same hardware manages 5{"–"}7 today. EdgeLM is an
              inference engine I&rsquo;m writing from scratch in C, and the
              basis for an upcoming paper.
            </p>

            <ul className="tags" aria-label="Techniques">
              <li>BitNet 1.58-bit ternary weights</li>
              <li>Hand-tuned AVX2 / AVX-VNNI kernels</li>
              <li>CPU + iGPU compute</li>
            </ul>
          </div>

          <figure className="fig">
            <div className="bars">
              <div className="bar-row">
                <span className="bar-label">Today</span>
                <span className="bar-value">5{"–"}7</span>
                <span className="bar-track">
                  <span className="bar-fill bar-fill-now" />
                </span>
              </div>
              <div className="bar-row">
                <span className="bar-label">Target</span>
                <span className="bar-value">100{"–"}120</span>
                <span className="bar-track">
                  <span className="bar-fill bar-fill-goal" />
                  <span className="bar-fill bar-fill-range" />
                </span>
              </div>
            </div>
            <figcaption>
              <b>Fig. 1</b> Tokens per second, 3B-parameter model, same CPU.
            </figcaption>
          </figure>
        </div>
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

        <div className="research-body">
          <div>
            <p className="entry-text">
              <i>
                Can a transformer do what a computer does, exactly and every
                time?
              </i>{" "}
              I&rsquo;m testing whether LLMs can natively reproduce classical
              computing primitives, and whether their attention can scale as
              O(n&nbsp;log&nbsp;n) instead of O(n{"²"}).
            </p>

            <ul className="tags" aria-label="Directions">
              <li>2D grid transformers</li>
              <li>Sub-quadratic attention</li>
              <li>Simulating state machines</li>
            </ul>
          </div>

          <figure className="fig">
            <svg
              className="plot"
              viewBox={`-4 -8 ${PLOT.width + 44} ${PLOT.height + 14}`}
              role="img"
              aria-label="Line chart: quadratic attention cost climbs steeply with sequence length while n log n stays close to flat."
            >
              <path
                className="plot-grid"
                d={`M0 ${PLOT.height * 0.25}H${PLOT.width}M0 ${PLOT.height * 0.5}H${PLOT.width}M0 ${PLOT.height * 0.75}H${PLOT.width}`}
              />
              <path
                className="plot-axis"
                d={`M0 0V${PLOT.height}H${PLOT.width}`}
              />
              <path className="plot-line plot-line-old" d={QUADRATIC} />
              <path className="plot-line plot-line-new" d={LOG_LINEAR} />
              <text x={PLOT.width + 5} y="6" className="plot-label">
                n{"²"}
              </text>
              <text
                x={PLOT.width + 5}
                y={PLOT.height - 7}
                className="plot-label plot-label-new"
              >
                n log n
              </text>
            </svg>
            <figcaption>
              <b>Fig. 2</b> Attention cost as the sequence gets longer.
            </figcaption>
          </figure>
        </div>
      </article>
    </Section>
  );
}
