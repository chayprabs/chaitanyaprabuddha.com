const projects = [
  {
    name: "LocalYapper",
    href: "https://github.com/chayprabs",
    description:
      "Fully local, offline voice dictation. Open source alternative to Wispr Flow - runs on local models, zero API calls, nothing leaves your machine.",
    tags: ["Local LLMs", "Voice", "Offline"]
  },
  {
    name: "StemLM",
    href: "https://github.com/chayprabs",
    description:
      "A browser extension that injects a 2-3kb subject-aware playbook into any LLM query, routing the model through a subject-chapter-topic-subtopic tree. Response comes back keyed, extension captures it, matches keys, renders a structured step-by-step breakdown in split view.",
    tags: ["Browser extension", "LLMs", "EdTech"]
  },
  {
    name: "IPL2026-LM",
    href: "https://github.com/chayprabs",
    description:
      "Post-toss, pre-ball IPL prediction engine. Ingests historical data, player context, venue signals, and live bookmaker markets into a structured ML pipeline built for decision-support, not benchmark chasing.",
    tags: ["ML", "Cricket", "Prediction"]
  }
];

export default function Projects() {
  return (
    <section
      id="projects"
      className="w-full border-t-[0.5px] border-t-[var(--color-border)] py-[88px]"
    >
      <div className="container">
        <p className="font-bebas mb-8 text-[11px] uppercase tracking-[0.15em] text-[#9a9890]">
          PROJECTS
        </p>

        <p className="font-jost mb-4 text-[11px] uppercase tracking-[0.15em] text-[#9a9890]">
          OPEN SOURCE
        </p>

        <div>
          {projects.map((project, index) => (
            <article
              key={project.name}
              className={`border-t-[0.5px] border-t-[var(--color-border)] py-6 ${
                index === projects.length - 1
                  ? "border-b-[0.5px] border-b-[var(--color-border)]"
                  : ""
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-jost text-[16px] font-medium leading-[1.8] text-[#1a1a18]">
                    {project.name}
                  </h3>
                  <p className="mt-[6px] max-w-[760px] text-[15px] leading-[1.8] text-[#1a1a18]">
                    {project.description}
                  </p>

                  <div className="mt-[10px] flex flex-wrap gap-[6px]">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-jost rounded-[2px] border-[0.5px] border-[rgba(0,0,0,0.2)] bg-transparent px-[8px] py-[3px] text-[12px] text-[#6b6860]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[12px] text-[#6b6860] transition-colors duration-200 ease-in-out hover:text-[#c84b2f]"
                >
                  ↗ GitHub
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
