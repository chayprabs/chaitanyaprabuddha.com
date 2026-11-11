import Section from "@/components/Section";

type Venture = {
  id: string;
  name: string;
  role: string;
  lede?: string;
  text?: string;
  audience: string;
  href: string;
  cta: string;
};

const ventures: Venture[] = [
  {
    id: "cruxo",
    name: "Cruxo",
    role: "Founder",
    audience: "trycruxo.com",
    href: "https://trycruxo.com",
    cta: "Visit site"
  },
  {
    id: "stemlm",
    name: "StemLM",
    role: "Co-founder",
    lede: "Step-by-step STEM solutions on top of the AI you already use.",
    text: "AI gives students the answer. StemLM shows the working: the method, formulas, diagrams, and the steps it skipped.",
    audience: "For undergrad STEM students",
    href: "https://www.stemlm.app/",
    cta: "Try StemLM"
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

            {venture.lede ? (
              <p className="card-lede">{venture.lede}</p>
            ) : null}
            {venture.text ? (
              <p className="card-text">{venture.text}</p>
            ) : null}
          </div>

          <div className="card-foot">
            <p className="label">{venture.audience}</p>

            <div className="card-actions">
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
