type SectionProps = {
  id: string;
  title: string;
  intro?: string;
  sheet?: boolean;
  children: React.ReactNode;
};

export default function Section({
  id,
  title,
  intro,
  sheet = true,
  children
}: SectionProps) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-title`}>
      <div className="container">
        <h2 id={`${id}-title`} className="section-label">
          <span>{title}</span>
        </h2>
        {intro ? <p className="section-intro">{intro}</p> : null}

        {sheet ? <div className="sheet">{children}</div> : children}
      </div>
    </section>
  );
}
