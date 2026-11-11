import Section from "@/components/Section";

const achievements = [
  {
    tone: "silver",
    placement: "2nd Place",
    name: "Eightfold AI Hackathon",
    org: "Eightfold AI \u00b7 Apogee tech fest 2026, BITS Pilani",
    description: (
      <>
        <i>2nd out of 700+ teams, as a team of one.</i> I built{" "}
        <a
          href="https://github.com/chayprabs/candor"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          Candor
        </a>, which catches a candidate getting help from an AI agent in the
        middle of an interview.
      </>
    )
  },
  {
    tone: "blue",
    placement: "Featured Builder",
    name: "OpenAI Codex Hackathon",
    org: "OpenAI \u00d7 GrowthX \u00b7 Bengaluru",
    description: (
      <>
        <i>One of 100 builders picked from 5,000+ applicants</i> for{" "}
        <a
          href="https://luma.com/x495vdw1?tk=AWqy9y&utm_source=growthx"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          India&rsquo;s first Codex hackathon
        </a>. I built and shipped{" "}
        <a
          href="https://github.com/chayprabs/codex-hack-bengaluru"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          my entry
        </a>{" "}
        there in a single day.
      </>
    )
  },
  {
    tone: "slate",
    placement: "Top 10",
    name: "ContextCon",
    org: "Crustdata \u00d7 Y Combinator \u00b7 Bengaluru",
    description: (
      <>
        <i>Top 10 of the 100 builders chosen from roughly 2,000 applicants.</i>{" "}
        <a
          href="https://luma.com/6ftay6mq"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          ContextCon
        </a>{" "}
        is Crustdata&rsquo;s YC-partnered hackathon. I built{" "}
        <a
          href="https://github.com/chayprabs/contextkings"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          ContextKings
        </a>{" "}
        on Crustdata&rsquo;s APIs in a 6-hour sprint.
      </>
    )
  },
  {
    tone: "gold",
    placement: "1st Place",
    name: "Solve for Pilani",
    org: "BITS Pilani \u00b7 Apogee tech fest 2025",
    description: (
      <>
        <i>
          {"\u20b9"}3 lakh+ (about $3,500) in sales in 5 days, for a
          professor&rsquo;s campus bakery.
        </i>{" "}
        We did it with the lowest average order value in the room. Every other
        team took cash only. We didn&rsquo;t.
      </>
    )
  },
  {
    tone: "bronze",
    placement: "3rd Place",
    name: "BITSpreneur",
    org: "BITS Pilani",
    description: (
      <>
        <i>The competition ended. The project didn&rsquo;t.</i> I built Gurja,
        a bio-CNG system that turns food waste from the campus dining halls
        into usable energy. It placed 3rd, then Blue Chip Food Management
        picked it up and it went live on campus in 2025.
      </>
    )
  }
];

export default function Achievements() {
  return (
    <Section id="achievements" title="Achievements">
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
