const projects = [
  {
    name: "LocalYapper",
    description:
      "Fully local, offline voice dictation. Open source alternative to Wispr Flow — runs on local models, zero API calls, nothing leaves your machine.",
    tags: ["Local LLMs", "Voice", "Offline"]
  },
  {
    name: "StemLM",
    description:
      "A browser extension that injects a 2-3kb subject-aware playbook into any LLM query, routing the model through a subject-chapter-topic-subtopic tree. Response comes back keyed, extension captures it, matches keys, renders a structured step-by-step breakdown in split view.",
    tags: ["Browser extension", "LLMs", "EdTech"]
  },
  {
    name: "IPL2026-LM",
    description:
      "Post-toss, pre-ball IPL prediction engine. Ingests historical data, player context, venue signals, and live bookmaker markets into a structured ML pipeline built for decision-support, not benchmark chasing.",
    tags: ["ML", "Cricket", "Prediction"]
  }
];

export default function Projects() {
  return (
    <section
      id="projects"
      className="w-full border-t border-black/[0.07] px-10 py-[72px]"
    >
      <p className="mb-8 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
        PROJECTS
      </p>

      <p className="mb-4 text-[11px] uppercase text-[#a09d95] [font-family:var(--font-satoshi)]">
        OPEN SOURCE
      </p>

      <div>
        {projects.map((project) => (
          <article
            key={project.name}
            className="mb-[10px] rounded-[10px] border border-black/[0.1] bg-[#FDFAF5] px-[22px] py-5 transition-colors duration-200 ease-in-out hover:border-black/[0.22]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-[15px] font-medium text-[#1a1a18] [font-family:var(--font-satoshi)]">
                  {project.name}
                </h3>
                <p className="mt-[6px] max-w-[760px] text-[13px] leading-[1.6] text-[#6b6960] [font-family:var(--font-satoshi)]">
                  {project.description}
                </p>

                <div className="mt-[10px] flex flex-wrap gap-[6px]">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[20px] bg-[#EDE8DF] px-[9px] py-[3px] text-[11px] text-[#7a6b4e] [font-family:var(--font-satoshi)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <span className="shrink-0 text-[12px] text-[#a09d95] [font-family:var(--font-satoshi)]">
                ↗ GitHub
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
