import Section from "@/components/Section";

const projects = [
  {
    name: "LocalYapper",
    href: "https://github.com/chayprabs/localyapper",
    linkType: "github",
    description: (
      <>
        <i>Press a key, speak, and your words land in whatever app you&rsquo;re
        using.</i>{" "}
        Speech recognition runs entirely on your own machine, in Rust, so no
        audio is ever uploaded or even written to disk. It idles at about
        30&nbsp;MB of RAM and runs on Windows, macOS, and Linux. A free, open
        source alternative to Wispr Flow and Superwhisper.
      </>
    )
  },
  {
    name: "Newsroom",
    href: "https://github.com/chayprabs/newsroom-socialmediamanager",
    linkType: "github",
    description: (
      <>
        <i>I built this to show Crustdata how I&rsquo;d run their data posts.
        It got me an internship offer from them.</i>{" "}
        One click turns a live X trend into a finished chart post in their
        style: Grok finds the story, Claude scores and reframes it,
        Crustdata&rsquo;s API supplies the numbers, and GPT-Image-2 draws the
        chart. Every query is checked against an audited list of Crustdata
        endpoints before it runs, so the charts are built on real data.
      </>
    )
  }
];

export default function Projects() {
  return (
    <Section id="projects" title="Projects">
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
