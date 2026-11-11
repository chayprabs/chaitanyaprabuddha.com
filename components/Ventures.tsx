import Section from "@/components/Section";

type Venture = {
  id: string;
  name: string;
  role: string;
  lede: string;
  text: string;
  href: string;
  cta: string;
};

const ventures: Venture[] = [
  {
    id: "cruxo",
    name: "Cruxo",
    role: "Founder",
    lede: "LeetCode for the prompting era.",
    text: "You write one plain-English prompt, an AI turns it into code, and hidden tests score the result. There is a new challenge every day and a leaderboard for who prompts best.",
    href: "https://trycruxo.com",
    cta: "Try Cruxo"
  },
  {
    id: "stemlm",
    name: "StemLM",
    role: "Co-founder",
    lede: "Step-by-step STEM solutions on top of the AI you already use.",
    text: "AI gives students the answer. StemLM shows the working: the method, formulas, diagrams, and the steps it skipped.",
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

            <p className="card-lede">{venture.lede}</p>
            <p className="card-text">{venture.text}</p>
          </div>

          <div className="card-foot">
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
