const projects = [
  {
    name: "LocalYapper",
    href: "https://github.com/chayprabs/localyapper",
    description:
      "A privacy-first voice dictation tool that runs entirely on-device. No cloud, no API calls, no data leaving your machine - just local models that adapt to how you speak. Open source alternative to Wispr Flow and Superwhisper."
  },
  {
    name: "StemLM",
    href: "https://github.com/chayprabs/stemLM",
    description:
      "A browser extension that injects a 2-3kb subject-aware playbook into any LLM query, routing the model through a subject-chapter-topic-subtopic tree. Response comes back keyed, extension captures it, matches keys, renders a structured step-by-step breakdown in split view."
  },
  {
    name: "IPL2026-LM",
    href: "https://github.com/chayprabs/ipl2026-LM",
    description:
      "Post-toss, pre-ball IPL prediction engine. Ingests historical data, player context, venue signals, and live bookmaker markets into a structured ML pipeline built for decision-support, not benchmark chasing."
  }
];

export default function Projects() {
  return (
    <section
      id="projects"
      className="w-full py-[48px]"
    >
      <div className="container">
        <p className="section-label mb-4 text-[9px] md:text-[10px]">
          PROJECTS
        </p>

        <div>
          {projects.map((project, index) => (
            <article
              key={project.name}
              className={`${
                index > 0 ? "border-t-[0.5px] border-t-[rgba(0,0,0,0.08)]" : ""
              }`}
            >
              <div className="rounded-[8px] border-[0.5px] border-transparent bg-transparent p-3 transition-all duration-200 ease-in-out hover:border-[rgba(0,0,0,0.1)] hover:bg-[#EDEAE5] md:p-4">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-jost text-[15px] font-semibold leading-[1.8] text-[#1a1a18] md:text-[16px]">
                      {project.name}
                    </h3>

                    <a
                      href={project.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${project.name} GitHub repository`}
                      className="mb-0 mt-[6px] shrink-0 text-[#9a9890] transition-colors duration-200 ease-in-out hover:text-[#1a1a18] md:mt-0"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        className="h-4 w-4 md:h-[18px] md:w-[18px]"
                      >
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    </a>
                  </div>

                  <p className="mt-[6px] max-w-[760px] text-[14px] font-light leading-[1.85] text-[#3a3a38] md:text-[15px]">
                    {project.description}
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
