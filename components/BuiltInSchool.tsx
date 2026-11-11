import Section from "@/components/Section";

const schoolProjects = [
  {
    name: "Developernoon",
    date: "",
    displayUrl: "developernoon.com",
    description:
      "A technical publishing platform I built and ran. I wrote and published 100+ developer articles on web development, Python, and open source. It reached a domain authority of 42 and 15,000 monthly visitors within 4 months, entirely through content.",
    stats: [
      { value: "42", label: "Domain authority" },
      { value: "15k", label: "Monthly visitors" }
    ]
  },
  {
    name: "Monial",
    date: "Mar 2022 – Jun 2022",
    displayUrl: "trymonial.app",
    description:
      "An embeddable testimonial SaaS for founders: one script tag, instant social proof on any website. It grew to 18 paying customers and $450+ MRR before JEE prep forced a shutdown.",
    stats: [
      { value: "18", label: "Customers" },
      { value: "$450+", label: "MRR" }
    ]
  }
];

export default function BuiltInSchool() {
  return (
    <Section id="beforebits" title="Before BITS" intro="Where the habit started.">
      {schoolProjects.map((project) => (
        <article key={project.name} className="entry">
          <div className="entry-head">
            <h3 className="entry-title">{project.name}</h3>
            <span className="leader" aria-hidden="true" />
            <span className="entry-aside" title="No longer active">
              {project.date ? `${project.date} · ` : ""}
              {project.displayUrl}
            </span>
          </div>

          <p className="entry-meta">No longer active</p>

          <p className="entry-text">{project.description}</p>

          <div className="stats">
            {project.stats.map((stat) => (
              <div key={stat.label} className="stat">
                <p className="stat-value">{stat.value}</p>
                <p className="label">{stat.label}</p>
              </div>
            ))}
          </div>
        </article>
      ))}

      <article className="entry">
        <h3 className="entry-title">Writing</h3>
        <p className="entry-text">
          The writing that started all of it. It front-paged{" "}
          <i>Hacker News</i>, reached 80k+ readers on <i>freeCodeCamp</i>, and
          earned Author of the Week on both <i>Hashnode</i> and{" "}
          <i>daily.dev</i>.
        </p>
      </article>
    </Section>
  );
}
