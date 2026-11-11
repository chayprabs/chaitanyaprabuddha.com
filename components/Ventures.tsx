import Section from "@/components/Section";

const ventures = [
  {
    id: "authos",
    name: "Authos",
    role: "Founder",
    lede: "Remote tools for coding agents like Claude Code and Codex.",
    text: "Coding agents need reliable tools outside the prompt. Authos runs browser sessions, Office and PDF conversion, large-file inspection, webhooks, sandboxes, temporary databases, logs, and artifact storage in controlled infrastructure, then returns structured JSON and signed artifact links through one API and MCP layer. The agent spends fewer tokens, needs less setup, and gets more accurate.",
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
    text: "ChatGPT, Claude, and Gemini give students answers. StemLM works alongside them and adds the exact step-by-step framework each subject demands, turning those answers into curriculum-aligned study views with the methods, formulas, diagrams, and missing steps students need to actually understand them.",
    audience: ["Undergrad students", "Structured STEM solutions", "Exam-ready understanding"],
    href: "https://www.stemlm.app/",
    cta: "Try StemLM",
    mail: null
  }
];

export default function Ventures() {
  return (
    <Section id="ventures" title="Ventures"
      intro="The two products I'm building right now."
      sheet={false}>
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
