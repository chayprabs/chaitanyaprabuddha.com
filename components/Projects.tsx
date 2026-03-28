const projects = [
  {
    name: "LocalYapper",
    href: "https://github.com/chayprabs",
    description:
      "Fully local, offline voice dictation. Open source alternative to Wispr Flow - runs on local models, zero API calls, nothing leaves your machine."
  },
  {
    name: "StemLM",
    href: "https://github.com/chayprabs",
    description:
      "A browser extension that injects a 2-3kb subject-aware playbook into any LLM query, routing the model through a subject-chapter-topic-subtopic tree. Response comes back keyed, extension captures it, matches keys, renders a structured step-by-step breakdown in split view."
  },
  {
    name: "IPL2026-LM",
    href: "https://github.com/chayprabs",
    description:
      "Post-toss, pre-ball IPL prediction engine. Ingests historical data, player context, venue signals, and live bookmaker markets into a structured ML pipeline built for decision-support, not benchmark chasing."
  }
];

export default function Projects() {
  return (
    <section
      id="projects"
      className="w-full border-t-[0.5px] border-t-[var(--color-border)] py-[72px]"
    >
      <div className="container">
        <div className="mb-6">
          <p className="font-bebas text-[11px] font-medium uppercase tracking-[0.15em] text-[#9a9890]">
            PROJECTS
          </p>

          <p className="font-jost mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9a9890]">
            OPEN SOURCE
          </p>
        </div>

        <div>
          {projects.map((project, index) => (
            <article
              key={project.name}
              className={`py-6 transition-colors duration-150 ease-in-out hover:bg-[rgba(0,0,0,0.02)] ${
                index > 0 ? "border-t-[0.5px] border-t-[rgba(0,0,0,0.08)]" : ""
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-jost text-[16px] font-semibold leading-[1.8] text-[#1a1a18]">
                    {project.name}
                  </h3>
                  <p className="mt-[6px] max-w-[760px] text-[15px] font-light leading-[1.85] text-[#3a3a38]">
                    {project.description}
                  </p>
                </div>

                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[13px] font-light text-[#9a9890] transition-colors duration-200 ease-in-out hover:text-[#c84b2f]"
                >
                  GitHub
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
