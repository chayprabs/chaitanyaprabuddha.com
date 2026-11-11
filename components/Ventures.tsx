import Section from "@/components/Section";

const ventures = [
  {
    id: "authos",
    name: "Authos",
    role: "Founder",
    lede: "Claude Code and Codex need reliable tools outside the prompt: remote execution that saves tokens, cuts setup cost, and improves accuracy.",
    text: "Authos runs browser sessions, Office and PDF conversion, large-file inspection, webhooks, sandboxes, temporary databases, logs, and artifact storage in controlled infrastructure, then returns structured JSON plus signed artifact links through one API and MCP layer.",
    audience: ["Agent builders", "Developers", "Engineering teams"],
    href: "https://authors.app",
    cta: "Visit site",
    mail: { href: "mailto:authos@chaitanyaprabuddha.com", label: "Ask about Authos" }
  },
  {
    id: "stemlm",
    name: "StemLM",
    role: "Co-founder",
    lede: "The structured way to solve STEM problems with AI.",
    text: "StemLM works alongside ChatGPT, Claude, and Gemini, adding the exact step-by-step framework each subject demands. It turns AI answers into curriculum-aligned study views with methods, formulas, diagrams, and the missing steps students actually need to understand.",
    audience: ["Undergrad students", "Structured STEM solutions", "Exam-ready understanding"],
    href: "https://www.stemlm.app/",
    cta: "Try StemLM",
    mail: null
  }
];

export default function Ventures() {
  return (
    <Section id="ventures" title="Ventures" sheet={false}>
      {ventures.map((venture) => (
        <article key={venture.id} id={venture.id} className="card">
          <div className="card-main">
            <div className="card-head">
              <h3 className="card-name">{venture.name}</h3>
              <span className="role">{venture.role}</span>
            </div>

            <p className="card-lede">{venture.lede}</p>
            <p className="card-text">{venture.text}</p>
          </div>

          <div className="card-foot">
            <p className="label">{venture.audience.join(" · ")}</p>

            <div className="card-actions">
              {venture.mail ? (
                <a href={venture.mail.href} className="btn">
                  {venture.mail.label}
                </a>
              ) : null}
              <a
                href={venture.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                {venture.cta} &rarr;
              </a>
            </div>
          </div>
        </article>
      ))}
    </Section>
  );
}
