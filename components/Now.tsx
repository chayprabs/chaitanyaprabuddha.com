import Section from "@/components/Section";

const infoColumns = [
  {
    label: "Music",
    text: "Beatles to Bob Dylan to Peter Cat Recording Co at 2am. Rock, pop, and anything with a soul in it."
  },
  {
    label: "Chess",
    text: "1600 on chess.com. Decent enough to enjoy it, humble enough to lose interestingly. Play me sometime."
  },
  {
    label: "Books",
    text: "Currently: Sapiens. Generally: biographies, anything that reframes how I see things."
  }
];

export default function Now() {
  return (
    <Section id="beyondthecode" title="Beyond the code">
      <p className="aside-intro">When I&apos;m not building &mdash;</p>

      <div className="trio">
        {infoColumns.map((column) => (
          <div key={column.label}>
            <h3>{column.label}</h3>
            <p>{column.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
