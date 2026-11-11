import Section from "@/components/Section";

const achievements = [
  {
    tone: "silver",
    placement: "2nd Place",
    name: "Eightfold AI Hackathon",
    org: "Eightfold AI - Apogee Fest 2026, BITS Pilani",
    description: (
      <>
        Built{" "}
        <a
          href="https://github.com/chayprabs/candor"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          Candor
        </a>
        , an agentic system that detects AI-agent assistance during interviews
        to make hiring fairer and more reliable. I competed solo against 700+
        teams and finished 2nd.
      </>
    )
  },
  {
    tone: "blue",
    placement: "Featured Builder",
    name: "OpenAI Codex Hackathon",
    org: "OpenAI x GrowthX - Bengaluru",
    description: (
      <>
        One of 100 builders selected from 5,000+ applicants for{" "}
        <a
          href="https://luma.com/x495vdw1?tk=AWqy9y&utm_source=growthx"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          OpenAI Codex Hackathon - Bengaluru
        </a>
        , India&apos;s first Codex hackathon. I built{" "}
        <a
          href="https://github.com/chayprabs/codex-hack-bengaluru"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          codex-hack-bengaluru
        </a>{" "}
        in a one-day sprint on agentic coding, developer tools, and AI-native
        product workflows.
      </>
    )
  },
  {
    tone: "slate",
    placement: "Top 10",
    name: "ContextCon",
    org: "Crustdata x Y Combinator - Bengaluru",
    description: (
      <>
        One of the top 100 selected from roughly 2,000 applicants for{" "}
        <a
          href="https://luma.com/6ftay6mq"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          ContextCon
        </a>
        , Crustdata&apos;s YC-partnered hackathon for developers, AI agent
        builders, and technical founders. I built{" "}
        <a
          href="https://github.com/chayprabs/contextkings"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          ContextKings
        </a>{" "}
        on Crustdata APIs in a 6-hour sprint and finished in the top 10.
      </>
    )
  },
  {
    tone: "gold",
    placement: "1st Place",
    name: "Solve for Pilani",
    org: "BITS Pilani - Apogee Fest 2025",
    description:
      "Marketed a professor's campus bakery at Apogee Fest and generated \u20b93L+ in revenue in 5 days, with the lowest average order value in the room. Every other team ran cash only. We didn't."
  },
  {
    tone: "bronze",
    placement: "3rd Place",
    name: "BITSpreneur",
    org: "BITS Pilani",
    description:
      "Built Gurja, a bio-CNG system that turns campus mess food waste into usable energy. It placed 3rd. Then Blue Chip Food Management picked the idea up and it went live on campus in 2025. The competition ended. The project didn't."
  }
];

export default function Achievements() {
  return (
    <Section id="achievements" title="Achievements"
      intro="Where the work got tested against other builders."
    >
      {achievements.map((achievement) => (
        <article key={achievement.name} className="entry">
          <div className="entry-head">
            <h3 className="entry-title">{achievement.name}</h3>
            <span className="leader" aria-hidden="true" />
            <span className={`badge badge-${achievement.tone}`}>
              {achievement.placement}
            </span>
          </div>

          <p className="entry-meta">{achievement.org}</p>

          <p className="entry-text">{achievement.description}</p>
        </article>
      ))}
    </Section>
  );
}
