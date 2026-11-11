import Section from "@/components/Section";

const ventures = [
  {
    id: "authos",
    name: "Authos",
    role: "Founder",
    lede: "Remote tools for coding agents like Claude Code and Codex.",
    text: "Coding agents need reliable tools outside the prompt. Authos runs browser sessions, Office and PDF conversion, large-file inspection, webhooks, sandboxes, temporary databases, logs, and artifact storage in controlled infrastructure, then returns structured JSON and signed artifact links through one API and MCP layer. The agent spends fewer tokens, needs less setup, and makes fewer mistakes.",
    audience: "For agent builders, developers, and engineering teams",
    href: "https://authors.app",
    cta: "Visit site",
    mail: { href: "mailto:authos@chaitanyaprabuddha.com", label: "Ask about Authos" }
  },
  {
    id: "stemlm",
    name: "StemLM",
    role: "Co-founder",
    lede: "Step-by-step STEM solutions on top of the AI you already use.",
    text: "ChatGPT, Claude, and Gemini give students an answer. StemLM works alongside them and lays that answer out the way the subject is taught: the method, the formulas, the diagrams, and the steps the AI skipped, all aligned to the curriculum.",
    audience: "For undergrad STEM students",
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
            <p className="label">{venture.audience}</p>

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
                {venture.cta} {"\u2197"}
              </a>
            </div>
          </div>
        </article>
      ))}
    </Section>
  );
}
