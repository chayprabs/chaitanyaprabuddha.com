import Section from "@/components/Section";

const projects = [
  {
    name: "LocalYapper",
    href: "https://github.com/chayprabs/localyapper",
    linkType: "github",
    description:
      "Voice dictation that never leaves your machine. No cloud and no API calls, just local models that adapt to how you speak. An open source alternative to Wispr Flow and Superwhisper."
  },
  {
    name: "Newsroom",
    href: "https://github.com/chayprabs/newsroom-socialmediamanager",
    linkType: "github",
    description:
      "An editorial AI pipeline that turns live X trends into Crustdata-style data posts. I built it after ContextCon. Grok finds the story, Claude scores and reframes it, Crustdata proves it with real data, and GPT-Image-2 renders the final social post. Every run gets endpoint validation, prompt caching, usage logs, and its own artifacts."
  }
];

export default function Projects() {
  return (
    <Section id="projects" title="Projects" intro="Open source, built on the side.">
      {projects.map((project) => (
        <article key={project.name} className="entry">
          <div className="entry-head">
            <h3 className="entry-title">{project.name}</h3>
            <span className="leader" aria-hidden="true" />
            <a
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.name} ${project.linkType === "website" ? "website" : "GitHub repository"}`}
              className="btn btn-small"
            >
              {project.linkType === "website" ? "Website" : "GitHub"} {"\u2197"}
            </a>
          </div>

          <p className="entry-text">{project.description}</p>
        </article>
      ))}
    </Section>
  );
}
